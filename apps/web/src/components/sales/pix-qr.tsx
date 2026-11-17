'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/money';

/**
 * QR Code do Pix com o valor da venda (BR §10.12, regra 8). Não confirma o
 * pagamento: o usuário confere no banco e só então confirma a venda.
 */
export function PixQr({
  payload,
  amountCents,
}: {
  payload: string;
  amountCents: number;
}) {
  const [image, setImage] = useState<string>();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 560,
    })
      .then((url) => active && setImage(url))
      .catch(() => active && setImage(undefined));
    return () => {
      active = false;
    };
  }, [payload]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid justify-items-center gap-3 rounded-lg border border-brand-accent bg-neutral-0 p-4 text-center">
      <strong className="text-md font-semibold text-neutral-900">
        Pix de {formatCents(amountCents)}
      </strong>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- QR gerado no próprio navegador (data URL)
        <img
          src={image}
          alt={`QR Code do Pix de ${formatCents(amountCents)}`}
          className="size-64 max-w-full"
        />
      ) : (
        <span className="grid size-64 place-items-center text-sm text-neutral-500">
          Gerando QR Code…
        </span>
      )}
      <Button type="button" variant="secondary" onClick={copy}>
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copied ? 'Código copiado' : 'Copiar Pix copia e cola'}
      </Button>
      <p className="text-xs text-neutral-500">
        Peça para o cliente ler o QR no app do banco. Quando o Pix cair na sua
        conta, toque em Confirmar.
      </p>
    </div>
  );
}
