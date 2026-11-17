'use client';

import { useState } from 'react';
import { ExternalLink, MessageCircle, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notify } from '@/components/ui/toaster';
import { whatsappLink, whatsappNumber } from '@/lib/campaigns';
import { receiptMessage, receiptUrl } from '@/lib/receipt';

/**
 * Enviar o recibo (BR §10.10, regra 26): WhatsApp do cliente com o link,
 * compartilhar (e-mail ou outro app) e abrir o recibo.
 */
export function ReceiptShare({
  token,
  storeName,
  customerName,
  customerWhatsapp,
}: {
  token: string;
  storeName: string;
  customerName?: string | null;
  customerWhatsapp?: string | null;
}) {
  const [sharing, setSharing] = useState(false);
  const url = () => receiptUrl(window.location.origin, token);
  const text = () => receiptMessage({ url: url(), storeName, customerName });
  const phone = whatsappNumber(customerWhatsapp);

  async function share() {
    setSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Recibo · ${storeName}`,
          text: text(),
        });
        return;
      }
      await navigator.clipboard.writeText(text());
      notify.success('Link do recibo copiado', 'Cole no e-mail ou no app.');
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError'))
        notify.error('Não foi possível compartilhar');
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      {phone && (
        <Button
          type="button"
          size="lg"
          onClick={() =>
            window.open(whatsappLink(phone, text()), '_blank', 'noopener')
          }
        >
          <MessageCircle aria-hidden="true" />
          Enviar recibo pelo WhatsApp
        </Button>
      )}
      <Button
        type="button"
        size="lg"
        variant={phone ? 'secondary' : 'primary'}
        onClick={share}
        disabled={sharing}
      >
        <Share2 aria-hidden="true" />
        Compartilhar recibo
      </Button>
      <Button asChild variant="tertiary">
        <a href={`/recibo/${token}`} target="_blank" rel="noopener">
          <ExternalLink aria-hidden="true" />
          Ver recibo
        </a>
      </Button>
    </div>
  );
}
