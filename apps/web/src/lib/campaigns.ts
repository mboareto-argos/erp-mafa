// Campanhas (BR §10.9, regras 9 a 12): texto personalizado e link do
// WhatsApp do próprio usuário. Nada de envio automático aqui — o usuário
// abre a conversa e aperta "enviar" (regra 11).

export type CampaignAudience = 'all' | 'birthdays' | 'brand' | 'inactive';
export type ConsentSource = 'in_person' | 'whatsapp' | 'instagram' | 'other';

export const AUDIENCE_LABEL: Record<CampaignAudience, string> = {
  all: 'Todos que aceitam ofertas',
  birthdays: 'Aniversariantes do mês',
  brand: 'Quem comprou uma marca',
  inactive: 'Quem está sem comprar',
};

export const CONSENT_SOURCE_LABEL: Record<ConsentSource, string> = {
  in_person: 'Pessoalmente',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  other: 'Outro',
};

/** Marcador que vira o primeiro nome do cliente. */
export const NAME_TAG = '{nome}';

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? '';
}

/**
 * Mensagem para um cliente: {nome} vira o primeiro nome. Sem nome (lista de
 * transmissão), o marcador some sem deixar espaço sobrando.
 */
export function personalize(message: string, name?: string) {
  if (name) return message.split(NAME_TAG).join(firstName(name));
  return message
    .replace(/[ \t]*\{nome\}/g, '')
    .replace(/ +([,!?.])/g, '$1')
    .trim();
}

/** Texto final: mensagem + link da foto (a foto vai como link — regra 11). */
export function messageWithImage(text: string, imageUrl?: string | null) {
  return imageUrl ? `${text}\n\n${imageUrl}` : text;
}

/**
 * Número no formato do wa.me (só dígitos, com DDI). Números brasileiros
 * digitados sem DDI (10 ou 11 dígitos) ganham o 55. Inválido → null.
 */
export function whatsappNumber(raw: string | null | undefined) {
  const digits = (raw ?? '').replace(/\D/g, '').replace(/^0+/, '');
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length >= 12 && digits.length <= 15) return digits;
  return null;
}

export function whatsappLink(phone: string, text: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/** URL da foto acessível fora do app (no local, /uploads é relativo). */
export function absoluteUrl(url: string | null | undefined, origin: string) {
  if (!url) return null;
  return url.startsWith('/') ? `${origin}${url}` : url;
}

/** Descrição curta do público da campanha. */
export function audienceText(campaign: {
  audience: CampaignAudience;
  audienceBrand?: { name: string } | null;
  audienceInactiveDays?: number | null;
}) {
  if (campaign.audience === 'brand' && campaign.audienceBrand)
    return `Quem comprou ${campaign.audienceBrand.name}`;
  if (campaign.audience === 'inactive' && campaign.audienceInactiveDays)
    return `Sem comprar há ${campaign.audienceInactiveDays} dias`;
  return AUDIENCE_LABEL[campaign.audience];
}
