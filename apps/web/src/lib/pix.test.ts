import { describe, expect, it } from 'vitest';
import { crc16, pixPayload, pixTxid } from './pix';

describe('Pix copia e cola (BR Code)', () => {
  it('reproduz o exemplo do Manual de Padrões do Pix (Banco Central)', () => {
    expect(
      pixPayload({
        key: '123e4567-e12b-12d1-a456-426655440000',
        merchantName: 'Fulano de Tal',
        merchantCity: 'BRASILIA',
      }),
    ).toBe(
      '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D',
    );
  });

  it('com valor, nome com acento e identificador da venda', () => {
    const payload = pixPayload({
      key: '11222333000181',
      merchantName: 'MAFA Store Perfumaria Árabe e Cia',
      merchantCity: 'São Paulo',
      amountCents: 29990,
      txid: pixTxid('8ad9bac0-48a8-4eb7-8852-c14ca2d6b09d'),
    });
    expect(payload).toContain('5406299.90');
    expect(payload).toContain('5925MAFA Store Perfumaria Ara');
    expect(payload).toContain('6009Sao Paulo');
    expect(payload).toContain('0525VENDA8AD9BAC048A84EB78852');
    // CRC confere com o resto do código.
    expect(payload.slice(-4)).toBe(crc16(payload.slice(0, -4)));
  });
});
