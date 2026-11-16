'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Flashlight, Keyboard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Formatos dos produtos da loja: EAN/UPC dos frascos, Code 128/39 de
// etiquetas e QR (alguns produtos importados vêm com QR).
const FORMATS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'qr_code',
] as const;

type Detector = {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
};

/**
 * Leitor nativo quando o navegador tem (Chrome/Android). No iPhone o Safari
 * não tem BarcodeDetector: carrega o decodificador WebAssembly (zxing) só
 * agora, servido pelo próprio app (public/vendor/zxing).
 */
async function createDetector(): Promise<Detector> {
  const Native = (
    globalThis as {
      BarcodeDetector?: {
        new (options: object): Detector;
        getSupportedFormats(): Promise<string[]>;
      };
    }
  ).BarcodeDetector;
  if (Native) {
    const supported = await Native.getSupportedFormats().catch(
      () => [] as string[],
    );
    const formats = FORMATS.filter((format) => supported.includes(format));
    if (formats.includes('ean_13')) return new Native({ formats });
  }
  const { BarcodeDetector, setZXingModuleOverrides } =
    await import('barcode-detector/ponyfill');
  setZXingModuleOverrides({
    locateFile: (path: string, prefix: string) =>
      path.endsWith('.wasm') ? `/vendor/zxing/${path}` : prefix + path,
  });
  return new BarcodeDetector({ formats: [...FORMATS] });
}

type ScannerError = 'denied' | 'unavailable' | 'insecure' | 'failed';
const ERRORS: Record<ScannerError, string> = {
  denied:
    'O acesso à câmera foi negado. Libere a câmera para este site nas configurações do navegador e tente de novo.',
  unavailable: 'Não encontramos uma câmera neste aparelho.',
  insecure:
    'A câmera só funciona em conexão segura (https). Digite o código abaixo.',
  failed: 'Não foi possível abrir a câmera. Digite o código abaixo.',
};

function errorFrom(cause: unknown): ScannerError {
  const name = (cause as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return 'unavailable';
  return 'failed';
}

/**
 * Câmera em tela cheia que lê código de barras/QR. Confirma a leitura em
 * dois quadros seguidos (evita leitura errada), vibra e entrega o código.
 * Em modo contínuo fica aberta para bipar vários itens (recebimento de
 * compra); senão fecha na primeira leitura.
 */
export function BarcodeScanner({
  open,
  onOpenChange,
  onDetected,
  title = 'Aponte para o código de barras',
  continuous = false,
  lastRead,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (code: string) => void;
  title?: string;
  continuous?: boolean;
  /** Texto do último item lido, mostrado no modo contínuo. */
  lastRead?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onDetectedRef = useRef(onDetected);
  const [error, setError] = useState<ScannerError>();
  const [starting, setStarting] = useState(false);
  const [torch, setTorch] = useState<{ available: boolean; on: boolean }>({
    available: false,
    on: false,
  });
  const [manual, setManual] = useState(false);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let timer: number | undefined;
    let previous = '';
    let pausedUntil = 0;

    async function start() {
      setError(undefined);
      setStarting(true);
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError('insecure');
        setStarting(false);
        return;
      }
      try {
        const [stream, detector] = await Promise.all([
          navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          }),
          createDetector(),
        ]);
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        const track = stream.getVideoTracks()[0];
        const capabilities = (track.getCapabilities?.() ?? {}) as {
          torch?: boolean;
        };
        setTorch({ available: Boolean(capabilities.torch), on: false });
        setStarting(false);

        const scan = async () => {
          if (cancelled) return;
          if (Date.now() >= pausedUntil && video.readyState >= 2) {
            const results = await detector.detect(video).catch(() => []);
            const code = results[0]?.rawValue?.trim() ?? '';
            if (code && code === previous) {
              navigator.vibrate?.(80);
              previous = '';
              if (continuous) {
                pausedUntil = Date.now() + 1200;
                onDetectedRef.current(code);
              } else {
                cancelled = true;
                stop();
                onDetectedRef.current(code);
                return;
              }
            } else {
              previous = code;
            }
          }
          timer = window.setTimeout(() => void scan(), 120);
        };
        void scan();
      } catch (cause) {
        if (!cancelled) {
          setError(errorFrom(cause));
          setStarting(false);
        }
      }
    }

    void start();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stop();
    };
  }, [open, continuous, stop]);

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torch.on;
    await track
      .applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      })
      .catch(() => undefined);
    setTorch({ available: true, on: next });
  }

  function submitTyped() {
    const code = typed.trim();
    if (!code) return;
    setTyped('');
    if (!continuous) stop();
    onDetected(code);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Content
          className="fixed inset-0 z-[60] flex flex-col bg-neutral-950 text-neutral-0 outline-none"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between gap-3 px-4 pt-[calc(12px+env(safe-area-inset-top))] pb-3">
            <Dialog.Title className="text-md font-semibold">
              {title}
            </Dialog.Title>
            <Dialog.Close
              className="grid size-11 place-items-center rounded-full bg-white/10 focus-visible:outline-2 focus-visible:outline-brand-accent"
              aria-label="Fechar câmera"
            >
              <X className="size-6" aria-hidden="true" />
            </Dialog.Close>
          </div>

          <div className="relative flex-1 overflow-hidden">
            <video
              ref={videoRef}
              className="absolute inset-0 size-full object-cover"
              playsInline
              muted
              aria-hidden="true"
            />
            {!error && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="h-40 w-[78%] max-w-sm rounded-lg border-2 border-brand-accent shadow-[0_0_0_9999px_rgba(11,15,25,0.55)]" />
              </div>
            )}
            {starting && !error && (
              <p
                className="absolute inset-x-0 bottom-6 text-center text-sm text-neutral-100"
                role="status"
              >
                Abrindo a câmera…
              </p>
            )}
            {error && (
              <p
                className="absolute inset-x-4 top-1/3 rounded-md bg-neutral-0 p-4 text-sm text-neutral-900"
                role="alert"
              >
                {ERRORS[error]}
              </p>
            )}
            {continuous && lastRead && (
              <p
                className="absolute inset-x-4 bottom-4 rounded-md bg-success-600 px-3 py-2 text-center text-sm font-semibold"
                role="status"
              >
                {lastRead}
              </p>
            )}
          </div>

          <div className="grid gap-3 px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
            {manual || error ? (
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitTyped();
                }}
              >
                <label className="sr-only" htmlFor="scanner-manual">
                  Digitar código
                </label>
                <input
                  id="scanner-manual"
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  autoFocus
                  placeholder="Digite o código"
                  className="h-12 min-w-0 flex-1 rounded-md border border-white/20 bg-white/10 px-3 text-md text-neutral-0 placeholder:text-neutral-300"
                />
                <Button type="submit" size="lg">
                  OK
                </Button>
              </form>
            ) : (
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setManual(true)}
                  className="flex min-h-11 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold"
                >
                  <Keyboard className="size-5" aria-hidden="true" />
                  Digitar código
                </button>
                {torch.available && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    aria-pressed={torch.on}
                    className={cn(
                      'flex min-h-11 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold',
                      torch.on && 'bg-brand-accent text-neutral-950',
                    )}
                  >
                    <Flashlight className="size-5" aria-hidden="true" />
                    Lanterna
                  </button>
                )}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
