import { describe, expect, it } from 'vitest';
import { receiptMessage, receiptUrl } from './receipt';

describe('recibo da venda', () => {
  it('link e mensagem com o primeiro nome do cliente', () => {
    const url = receiptUrl('https://app.argosdev.com.br', 'abc123');
    expect(url).toBe('https://app.argosdev.com.br/recibo/abc123');
    expect(
      receiptMessage({
        url,
        storeName: 'MAFA Store',
        customerName: 'Ana Souza',
      }),
    ).toBe(
      'Oi Ana! Obrigado pela compra na MAFA Store. Seu recibo: https://app.argosdev.com.br/recibo/abc123',
    );
    expect(receiptMessage({ url, storeName: 'MAFA Store' })).toMatch(/^Oi! /);
  });
});
