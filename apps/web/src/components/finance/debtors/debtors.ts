import { formatCents, toCents } from '@/lib/money';

// "Quem me deve": contas a receber em aberto agrupadas por cliente, com o
// atraso calculado pela DATA no fuso da loja (não pelo horário UTC — uma
// parcela que vence hoje não está atrasada hoje).

export type ReceivableItem = {
  id: string;
  description: string;
  amountOriginal: string;
  amountReceived: string;
  dueDate: string;
  status: 'pending' | 'partially_received' | 'received' | 'cancelled';
  installmentNumber?: number | null;
  installmentCount?: number | null;
  customer?: {
    id: string;
    name: string;
    whatsapp?: string | null;
    phone?: string | null;
  } | null;
};

export type OpenInstallment = {
  id: string;
  label: string;
  dueDate: string;
  openCents: number;
  overdueDays: number;
};

export type Debtor = {
  key: string;
  customerId: string | null;
  name: string;
  phone: string | null;
  openCents: number;
  overdueCents: number;
  /** Dias de atraso da parcela mais antiga em aberto (0 = em dia). */
  overdueDays: number;
  nextDue: string | null;
  installments: OpenInstallment[];
};

const civil = (iso: string) => iso.slice(0, 10);

/** "Hoje" no fuso da loja, como AAAA-MM-DD. */
export function todayIn(timeZone: string, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function daysBetween(fromIso: string, toIso: string) {
  const from = Date.UTC(
    +fromIso.slice(0, 4),
    +fromIso.slice(5, 7) - 1,
    +fromIso.slice(8, 10),
  );
  const to = Date.UTC(
    +toIso.slice(0, 4),
    +toIso.slice(5, 7) - 1,
    +toIso.slice(8, 10),
  );
  return Math.round((to - from) / 86_400_000);
}

export function groupDebtors(
  receivables: ReceivableItem[],
  today: string,
): Debtor[] {
  const groups = new Map<string, Debtor>();
  for (const item of receivables) {
    if (item.status !== 'pending' && item.status !== 'partially_received')
      continue;
    const openCents =
      toCents(item.amountOriginal) - toCents(item.amountReceived);
    if (openCents <= 0) continue;
    const due = civil(item.dueDate);
    const overdueDays = Math.max(0, daysBetween(due, today));
    const key = item.customer?.id ?? 'sem-cliente';
    const debtor =
      groups.get(key) ??
      ({
        key,
        customerId: item.customer?.id ?? null,
        name: item.customer?.name ?? 'Sem cliente',
        phone: item.customer?.whatsapp || item.customer?.phone || null,
        openCents: 0,
        overdueCents: 0,
        overdueDays: 0,
        nextDue: null,
        installments: [],
      } satisfies Debtor);
    debtor.openCents += openCents;
    if (overdueDays > 0) debtor.overdueCents += openCents;
    debtor.overdueDays = Math.max(debtor.overdueDays, overdueDays);
    if (overdueDays === 0 && (!debtor.nextDue || due < debtor.nextDue))
      debtor.nextDue = due;
    debtor.installments.push({
      id: item.id,
      label:
        item.installmentNumber && item.installmentCount
          ? `Parcela ${item.installmentNumber} de ${item.installmentCount}`
          : item.description,
      dueDate: due,
      openCents,
      overdueDays,
    });
    groups.set(key, debtor);
  }
  for (const debtor of groups.values())
    debtor.installments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  // Quem está mais atrasado primeiro; depois quem vence antes.
  return [...groups.values()].sort(
    (a, b) =>
      b.overdueDays - a.overdueDays ||
      (a.nextDue ?? '9999').localeCompare(b.nextDue ?? '9999') ||
      a.name.localeCompare(b.name),
  );
}

export function debtorSummary(debtors: Debtor[], today: string) {
  const weekLimit = addDays(today, 7);
  return {
    openCents: debtors.reduce((sum, debtor) => sum + debtor.openCents, 0),
    overdueCents: debtors.reduce((sum, debtor) => sum + debtor.overdueCents, 0),
    overdueCount: debtors.filter((debtor) => debtor.overdueCents > 0).length,
    weekCents: debtors
      .flatMap((debtor) => debtor.installments)
      .filter((item) => item.overdueDays === 0 && item.dueDate <= weekLimit)
      .reduce((sum, item) => sum + item.openCents, 0),
  };
}

export function addDays(iso: string, days: number) {
  const date = new Date(
    Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + days),
  );
  return date.toISOString().slice(0, 10);
}

const shortDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/**
 * Mensagem de cobrança pronta para o WhatsApp: cordial, objetiva e sem
 * urgência artificial (DS §11.2). Lista o que está atrasado; se nada
 * estiver, lembra a próxima parcela.
 */
export function chargeMessage(debtor: Debtor, companyName: string) {
  const firstName = debtor.name.trim().split(/\s+/)[0];
  const overdue = debtor.installments.filter((item) => item.overdueDays > 0);
  const listed = overdue.length > 0 ? overdue : debtor.installments.slice(0, 1);
  const lines = listed.map(
    (item) =>
      `• ${item.label} — ${formatCents(item.openCents)} — ${item.overdueDays > 0 ? 'venceu' : 'vence'} em ${shortDate(item.dueDate)}`,
  );
  const intro =
    overdue.length > 0
      ? `Passando para lembrar ${overdue.length === 1 ? 'da parcela' : 'das parcelas'} em aberto da sua compra na ${companyName}:`
      : `Passando para lembrar da próxima parcela da sua compra na ${companyName}:`;
  return [
    `Oi, ${firstName}! Tudo bem?`,
    '',
    intro,
    ...lines,
    '',
    `Total em aberto: ${formatCents(debtor.openCents)}.`,
    'Se já pagou, é só me avisar que eu dou baixa aqui. Agradeço!',
  ]
    .join('\n')
    .replace(/ /g, ' ');
}

/** Link wa.me com DDI 55 quando o número for brasileiro sem DDI. */
export function whatsappLink(phone: string | null, message: string) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (digits.length < 12 || digits.length > 13) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
