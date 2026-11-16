'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notify } from '@/components/ui/toaster';
import {
  AUDIENCE_LABEL,
  NAME_TAG,
  personalize,
  type CampaignAudience,
} from '@/lib/campaigns';
import { resizeImage } from '@/lib/image-resize';
import { cn } from '@/lib/utils';

export type CampaignFormValues = {
  id?: string;
  title: string;
  message: string;
  imageUrl: string | null;
  audience: CampaignAudience;
  audienceBrandId: string | null;
  audienceInactiveDays: number | null;
};

type Preview = { count: number; withoutPhone: number };

const inputClass =
  'w-full rounded-md border border-neutral-200 px-3 text-md text-neutral-900 focus:border-brand-accent focus:outline-none';

/**
 * Campanha (BR §10.9, regra 10): título, mensagem, foto opcional e público.
 * Mostra ao vivo quantos clientes o público alcança — sempre só quem
 * aceitou receber ofertas (regra 9; o filtro é do servidor).
 */
export function CampaignForm({
  initial,
  brands,
}: {
  initial?: CampaignFormValues;
  brands: { id: string; name: string }[];
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [message, setMessage] = useState(
    initial?.message ?? `Oi ${NAME_TAG}! `,
  );
  const [audience, setAudience] = useState<CampaignAudience>(
    initial?.audience ?? 'all',
  );
  const [brandId, setBrandId] = useState(initial?.audienceBrandId ?? '');
  const [days, setDays] = useState(initial?.audienceInactiveDays ?? 60);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initial?.imageUrl ?? null,
  );
  const [removePhoto, setRemovePhoto] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const audienceReady =
    (audience !== 'brand' || Boolean(brandId)) &&
    (audience !== 'inactive' || days > 0);
  const audienceBody = {
    audience,
    audienceBrandId: audience === 'brand' ? brandId || null : null,
    audienceInactiveDays: audience === 'inactive' ? days : null,
  };
  const audienceKey = JSON.stringify(audienceBody);

  // Público alcançado, recalculado quando o critério muda.
  useEffect(() => {
    if (!audienceReady) return;
    let active = true;
    const timer = setTimeout(() => {
      fetch('/api/campaigns/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: audienceKey,
      })
        .then(async (response) =>
          response.ok ? ((await response.json()) as Preview) : null,
        )
        .then((result) => active && setPreview(result))
        .catch(() => active && setPreview(null));
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [audienceKey, audienceReady]);

  async function pickPhoto(file: File) {
    try {
      const resized = await resizeImage(file);
      const ready = new File([resized], 'campanha.jpg', { type: resized.type });
      setPhoto(ready);
      setRemovePhoto(false);
      setPhotoPreview(URL.createObjectURL(ready));
    } catch {
      notify.error('Não foi possível usar esta foto');
    }
  }

  async function save() {
    if (!title.trim()) return setError('Dê um título à campanha.');
    if (!message.trim()) return setError('Escreva a mensagem.');
    if (!audienceReady)
      return setError(
        audience === 'brand'
          ? 'Escolha a marca.'
          : 'Informe há quantos dias sem comprar.',
      );
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(
        initial?.id ? `/api/campaigns/${initial.id}` : '/api/campaigns',
        {
          method: initial?.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            message: message.trim(),
            ...audienceBody,
          }),
        },
      );
      const body = (await response.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
      };
      if (!response.ok || !(body.id ?? initial?.id))
        throw new Error(body.message ?? 'Não foi possível salvar.');
      const id = (body.id ?? initial?.id)!;

      if (photo) {
        const form = new FormData();
        form.append('file', photo, photo.name);
        const upload = await fetch(`/api/campaigns/${id}/image`, {
          method: 'POST',
          body: form,
        });
        if (!upload.ok) {
          const uploadBody = (await upload.json().catch(() => ({}))) as {
            message?: string;
          };
          notify.error(
            'Campanha salva, mas a foto não foi',
            uploadBody.message,
          );
        }
      } else if (removePhoto && initial?.imageUrl) {
        await fetch(`/api/campaigns/${id}/image`, { method: 'DELETE' });
      }

      notify.success('Campanha salva', title.trim());
      router.push(`/campanhas/${id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Tente de novo.');
    } finally {
      setPending(false);
    }
  }

  const options = (Object.keys(AUDIENCE_LABEL) as CampaignAudience[]).filter(
    (option) => option !== 'brand' || brands.length > 0,
  );

  return (
    <form
      className="grid grid-cols-1 gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      noValidate
    >
      <section className="grid grid-cols-1 gap-3 rounded-lg border border-neutral-100 bg-neutral-0 p-4">
        <div className="grid gap-1">
          <label
            htmlFor="campaign-title"
            className="text-sm font-semibold text-neutral-700"
          >
            Título <small className="font-normal">(só para você)</small>
          </label>
          <input
            id="campaign-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            placeholder="Ex.: Dia das Mães"
            className={cn(inputClass, 'h-12')}
          />
        </div>
        <div className="grid gap-1">
          <label
            htmlFor="campaign-message"
            className="text-sm font-semibold text-neutral-700"
          >
            Mensagem
          </label>
          <textarea
            id="campaign-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={2000}
            rows={6}
            className={cn(inputClass, 'py-2')}
          />
          <p className="text-xs text-neutral-500">
            Escreva <code className="font-mono">{NAME_TAG}</code> onde vai o
            primeiro nome do cliente.
            {message.includes(NAME_TAG) && (
              <>
                {' '}
                Fica assim: “{personalize(message, 'Ana Souza').slice(0, 80)}
                {personalize(message, 'Ana Souza').length > 80 ? '…' : ''}”
              </>
            )}
          </p>
        </div>

        <div className="grid gap-2">
          <span className="text-sm font-semibold text-neutral-700">
            Foto <small className="font-normal">(opcional)</small>
          </span>
          {photoPreview && (
            // eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) ou foto já enviada
            <img
              src={photoPreview}
              alt="Foto da campanha"
              className="max-h-64 w-full rounded-md object-contain bg-neutral-50"
            />
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileInput.current?.click()}
            >
              <Camera aria-hidden="true" />
              {photoPreview ? 'Trocar foto' : 'Escolher foto'}
            </Button>
            {photoPreview && (
              <Button
                type="button"
                variant="tertiary"
                onClick={() => {
                  setPhoto(null);
                  setPhotoPreview(null);
                  setRemovePhoto(true);
                }}
              >
                <Trash2 aria-hidden="true" />
                Tirar foto
              </Button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Foto da campanha"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void pickPhoto(file);
              event.target.value = '';
            }}
          />
        </div>
      </section>

      <fieldset className="grid grid-cols-1 gap-3 rounded-lg border border-neutral-100 bg-neutral-0 p-4">
        <legend className="px-1 text-sm font-semibold text-neutral-700">
          Quem recebe
        </legend>
        <div className="grid gap-2">
          {options.map((option) => (
            <label
              key={option}
              className={cn(
                'flex min-h-12 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm',
                audience === option
                  ? 'border-brand-accent bg-brand-accent-subtle'
                  : 'border-neutral-200',
              )}
            >
              <input
                type="radio"
                name="campaign-audience"
                checked={audience === option}
                onChange={() => setAudience(option)}
                className="accent-brand-accent"
              />
              <span className="font-semibold text-neutral-900">
                {AUDIENCE_LABEL[option]}
              </span>
            </label>
          ))}
        </div>
        {audience === 'brand' && (
          <div className="grid gap-1">
            <label
              htmlFor="campaign-brand"
              className="text-sm font-semibold text-neutral-700"
            >
              Marca
            </label>
            <select
              id="campaign-brand"
              value={brandId}
              onChange={(event) => setBrandId(event.target.value)}
              className={cn(inputClass, 'h-12')}
            >
              <option value="">Escolha a marca</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {audience === 'inactive' && (
          <div className="grid gap-1">
            <label
              htmlFor="campaign-days"
              className="text-sm font-semibold text-neutral-700"
            >
              Sem comprar há quantos dias?
            </label>
            <input
              id="campaign-days"
              type="number"
              inputMode="numeric"
              min={1}
              max={3650}
              value={days || ''}
              onChange={(event) => setDays(Number(event.target.value))}
              className={cn(inputClass, 'h-12')}
            />
          </div>
        )}
        <p
          className="flex items-center gap-2 rounded-md bg-neutral-25 p-3 text-sm text-neutral-700"
          role="status"
        >
          <Users
            className="size-4 shrink-0 text-brand-accent-hover"
            aria-hidden="true"
          />
          {!audienceReady || !preview
            ? 'Calculando quem recebe…'
            : preview.count === 0
              ? 'Ninguém neste público aceitou receber ofertas ainda.'
              : `${preview.count} ${preview.count === 1 ? 'cliente recebe' : 'clientes recebem'}`}
          {audienceReady && preview && preview.withoutPhone > 0
            ? ` · ${preview.withoutPhone} sem WhatsApp`
            : ''}
        </p>
      </fieldset>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-600"
        >
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Salvando…' : 'Salvar e ver quem recebe'}
      </Button>
    </form>
  );
}
