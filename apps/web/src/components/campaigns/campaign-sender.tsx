'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Archive, Check, Pencil, Send, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notify } from '@/components/ui/toaster';
import {
  absoluteUrl,
  messageWithImage,
  personalize,
  whatsappLink,
  whatsappNumber,
} from '@/lib/campaigns';
import { cn } from '@/lib/utils';

export type CampaignRecipient = {
  id: string;
  name: string;
  whatsapp: string | null;
  sentAt: string | null;
};

const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso));

/**
 * Envio 1 a 1 (BR §10.9, regra 11): cada "Enviar" abre a conversa no
 * WhatsApp do próprio usuário com o texto pronto e marca o cliente como
 * enviado. "Compartilhar" manda foto + texto para a lista de transmissão.
 * Nenhum envio automático — o usuário aperta "enviar" no WhatsApp (regra 12).
 */
export function CampaignSender({
  campaignId,
  message,
  imageUrl,
  recipients: initialRecipients,
  withoutPhone,
  canManage,
}: {
  campaignId: string;
  message: string;
  imageUrl: string | null;
  recipients: CampaignRecipient[];
  withoutPhone: number;
  canManage: boolean;
}) {
  const router = useRouter();
  const [recipients, setRecipients] = useState(initialRecipients);
  const [pendingId, setPendingId] = useState<string>();
  const [sharing, setSharing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const sent = recipients.filter((recipient) => recipient.sentAt).length;
  const total = recipients.length;

  const photoUrl = () => absoluteUrl(imageUrl, window.location.origin);

  async function send(recipient: CampaignRecipient) {
    const phone = whatsappNumber(recipient.whatsapp);
    if (!phone) return;
    const text = messageWithImage(
      personalize(message, recipient.name),
      photoUrl(),
    );
    // Abre antes do await: navegadores do celular bloqueiam janela aberta
    // depois de uma espera.
    window.open(whatsappLink(phone, text), '_blank', 'noopener');
    if (recipient.sentAt || !canManage) return;
    setPendingId(recipient.id);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/deliveries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: recipient.id }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        sentAt?: string;
        message?: string;
      };
      if (!response.ok)
        throw new Error(body.message ?? 'Não foi possível marcar o envio.');
      setRecipients((current) =>
        current.map((item) =>
          item.id === recipient.id
            ? { ...item, sentAt: body.sentAt ?? new Date().toISOString() }
            : item,
        ),
      );
    } catch (cause) {
      notify.error(
        'Não marcou como enviado',
        cause instanceof Error ? cause.message : undefined,
      );
    } finally {
      setPendingId(undefined);
    }
  }

  // Lista de transmissão: foto como arquivo quando o celular deixa
  // compartilhar arquivo; senão, texto com o link da foto; senão, copia.
  async function share() {
    const text = personalize(message);
    const url = photoUrl();
    setSharing(true);
    try {
      if (url && navigator.canShare) {
        try {
          const blob = await (await fetch(url)).blob();
          const file = new File([blob], 'oferta.jpg', {
            type: blob.type || 'image/jpeg',
          });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], text });
            return;
          }
        } catch (cause) {
          if (cause instanceof DOMException && cause.name === 'AbortError')
            return;
        }
      }
      const full = messageWithImage(text, url);
      if (navigator.share) {
        await navigator.share({ text: full });
        return;
      }
      await navigator.clipboard.writeText(full);
      notify.success(
        'Texto copiado',
        'Cole na sua lista de transmissão do WhatsApp.',
      );
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError'))
        notify.error('Não foi possível compartilhar');
    } finally {
      setSharing(false);
    }
  }

  async function archive() {
    setArchiving(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/archive`, {
        method: 'PATCH',
      });
      if (!response.ok) throw new Error();
      notify.success('Campanha arquivada');
      router.push('/campanhas');
      router.refresh();
    } catch {
      notify.error('Não foi possível arquivar');
      setArchiving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid gap-2 sm:flex sm:flex-wrap">
        <Button
          type="button"
          size="lg"
          variant="secondary"
          onClick={share}
          disabled={sharing}
        >
          <Share2 aria-hidden="true" />
          Compartilhar na lista de transmissão
        </Button>
        {canManage && (
          <Button asChild size="lg" variant="tertiary">
            <Link href={`/campanhas/${campaignId}/editar`}>
              <Pencil aria-hidden="true" />
              Editar
            </Link>
          </Button>
        )}
      </div>

      <section
        aria-labelledby="recipients-title"
        className="grid min-w-0 grid-cols-1 gap-3 rounded-lg border border-neutral-100 bg-neutral-0 p-4"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2
            id="recipients-title"
            className="text-lg font-semibold text-neutral-900"
          >
            Enviar um a um
          </h2>
          <span className="text-sm font-semibold text-neutral-700 tabular-nums">
            {sent} de {total} enviados
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-neutral-50"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={sent}
          aria-label="Envios feitos"
        >
          <div
            className="h-full rounded-full bg-brand-accent transition-[width]"
            style={{ width: total ? `${(sent / total) * 100}%` : '0%' }}
          />
        </div>
        <p className="text-xs text-neutral-500">
          Cada “Enviar” abre a conversa no seu WhatsApp com a mensagem pronta; é
          só apertar enviar lá.
          {withoutPhone > 0 &&
            ` ${withoutPhone} ${withoutPhone === 1 ? 'cliente aceitou' : 'clientes aceitaram'} ofertas mas não tem WhatsApp cadastrado.`}
        </p>

        {total === 0 ? (
          <p className="rounded-md bg-neutral-25 p-3 text-sm text-neutral-700">
            Ninguém neste público aceitou receber ofertas ainda. Marque “Aceita
            receber ofertas” no cadastro dos clientes.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {recipients.map((recipient) => {
              const phone = whatsappNumber(recipient.whatsapp);
              return (
                <li
                  key={recipient.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="min-w-0">
                    <strong className="block truncate text-sm font-semibold text-neutral-900">
                      {recipient.name}
                    </strong>
                    <span
                      className={cn(
                        'block text-xs',
                        recipient.sentAt
                          ? 'text-success-600'
                          : phone
                            ? 'text-neutral-500'
                            : 'text-danger-600',
                      )}
                    >
                      {recipient.sentAt
                        ? `Enviado em ${dateLabel(recipient.sentAt)}`
                        : phone
                          ? recipient.whatsapp
                          : 'Número inválido'}
                    </span>
                  </span>
                  {phone && (
                    <Button
                      type="button"
                      variant={recipient.sentAt ? 'tertiary' : 'primary'}
                      disabled={pendingId === recipient.id}
                      onClick={() => send(recipient)}
                      aria-label={`${recipient.sentAt ? 'Reenviar' : 'Enviar'} para ${recipient.name}`}
                    >
                      {recipient.sentAt ? (
                        <Check aria-hidden="true" />
                      ) : (
                        <Send aria-hidden="true" />
                      )}
                      {recipient.sentAt ? 'Reenviar' : 'Enviar'}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {canManage && (
        <Button
          type="button"
          variant="tertiary"
          className="justify-self-start"
          onClick={archive}
          disabled={archiving}
        >
          <Archive aria-hidden="true" />
          Arquivar campanha
        </Button>
      )}
    </div>
  );
}
