import { describe, expect, it } from 'vitest';
import {
  chargeMessage,
  daysBetween,
  debtorSummary,
  groupDebtors,
  todayIn,
  whatsappLink,
  type ReceivableItem,
} from './debtors';

const TODAY = '2026-11-16';
const juliana = { id: 'c1', name: 'Juliana Costa', whatsapp: null };
const carla = { id: 'c2', name: 'Carla Mendes', whatsapp: '(11) 98888-7777' };
const item = (
  id: string,
  customer: ReceivableItem['customer'],
  dueDate: string,
  amount = '100',
  extra: Partial<ReceivableItem> = {},
): ReceivableItem => ({
  id,
  description: `Venda · parcela`,
  amountOriginal: amount,
  amountReceived: '0',
  dueDate: `${dueDate}T00:00:00.000Z`,
  status: 'pending',
  installmentNumber: 1,
  installmentCount: 3,
  customer,
  ...extra,
});

describe('atraso pela data no fuso da loja', () => {
  it('vence hoje NÃO é atraso; ontem é 1 dia', () => {
    const [debtor] = groupDebtors([item('a', carla, TODAY)], TODAY);
    expect(debtor.overdueDays).toBe(0);
    expect(debtor.nextDue).toBe(TODAY);
    expect(
      groupDebtors([item('b', carla, '2026-11-15')], TODAY)[0].overdueDays,
    ).toBe(1);
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
  });

  it('"hoje" respeita o fuso: 23h em São Paulo ainda é o mesmo dia', () => {
    const lateNightUtc = new Date('2026-11-17T02:00:00Z'); // 23h de 16/11 em SP
    expect(todayIn('America/Sao_Paulo', lateNightUtc)).toBe('2026-11-16');
    expect(todayIn('UTC', lateNightUtc)).toBe('2026-11-17');
  });
});

describe('agrupamento por cliente', () => {
  it('soma só o saldo em aberto e ignora recebidas/canceladas', () => {
    const debtors = groupDebtors(
      [
        item('1', juliana, '2026-11-11', '136.60'),
        item('2', juliana, '2026-12-11', '136.60', {
          amountReceived: '36.60',
          status: 'partially_received',
        }),
        item('3', juliana, '2027-01-11', '136.60', {
          status: 'received',
          amountReceived: '136.60',
        }),
        item('4', juliana, '2027-02-11', '50', { status: 'cancelled' }),
      ],
      TODAY,
    );
    expect(debtors).toHaveLength(1);
    expect(debtors[0]).toMatchObject({
      openCents: 23660,
      overdueCents: 13660,
      overdueDays: 5,
      nextDue: '2026-12-11',
    });
    expect(debtors[0].installments.map((i) => i.openCents)).toEqual([
      13660, 10000,
    ]);
  });

  it('mais atrasado primeiro, depois quem vence antes; sem cliente vira um grupo', () => {
    const debtors = groupDebtors(
      [
        item('1', carla, '2026-12-16'),
        item('2', juliana, '2026-11-11'),
        item('3', null, '2026-11-20', '50', {
          installmentNumber: null,
          description: 'Acerto manual',
        }),
      ],
      TODAY,
    );
    expect(debtors.map((d) => d.name)).toEqual([
      'Juliana Costa',
      'Sem cliente',
      'Carla Mendes',
    ]);
    expect(debtors[1].installments[0].label).toBe('Acerto manual');
  });

  it('resumo: total, atrasado e o que vence em 7 dias', () => {
    const debtors = groupDebtors(
      [
        item('1', juliana, '2026-11-11'),
        item('2', carla, '2026-11-20'),
        item('3', carla, '2026-12-20'),
      ],
      TODAY,
    );
    expect(debtorSummary(debtors, TODAY)).toEqual({
      openCents: 30000,
      overdueCents: 10000,
      overdueCount: 1,
      weekCents: 10000,
    });
  });
});

describe('cobrança no WhatsApp', () => {
  it('lista o que está atrasado, com o total em aberto', () => {
    const [debtor] = groupDebtors(
      [
        item('1', juliana, '2026-11-11', '136.60'),
        item('2', juliana, '2026-12-11', '136.60'),
      ],
      TODAY,
    );
    const message = chargeMessage(debtor, 'MAFA Store');
    expect(message).toContain('Oi, Juliana!');
    expect(message).toContain(
      'da parcela em aberto da sua compra na MAFA Store',
    );
    expect(message).toContain('• Parcela 1 de 3 — R$ 136,60 — venceu em 11/11');
    expect(message).not.toContain('11/12');
    expect(message).toContain('Total em aberto: R$ 273,20.');
  });

  it('sem atraso, lembra só a próxima parcela', () => {
    const [debtor] = groupDebtors(
      [
        item('1', carla, '2026-12-16', '179.93'),
        item('2', carla, '2027-01-16'),
      ],
      TODAY,
    );
    expect(chargeMessage(debtor, 'MAFA Store')).toContain(
      'lembrar da próxima parcela',
    );
    expect(chargeMessage(debtor, 'MAFA Store')).toContain('vence em 16/12');
  });

  it('link wa.me com DDI 55; número inválido não gera link', () => {
    expect(whatsappLink('(11) 98888-7777', 'oi')).toBe(
      'https://wa.me/5511988887777?text=oi',
    );
    expect(whatsappLink('+55 11 98888-7777', 'oi')).toBe(
      'https://wa.me/5511988887777?text=oi',
    );
    expect(whatsappLink('1198888777711988887777', 'oi')).toBeNull();
    expect(whatsappLink(null, 'oi')).toBeNull();
  });
});
