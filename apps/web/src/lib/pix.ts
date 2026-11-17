// "Pix copia e cola" estático com valor (BR Code do Banco Central, padrão
// EMV QRCPS-MPM) — BR §10.12, regra 8. Gerado no próprio app a partir da
// chave Pix da forma de pagamento; não depende de banco nem de API externa.
// Não confirma o pagamento: o usuário confere no banco e confirma a venda.

const field = (id: string, value: string) =>
  `${id}${String(value.length).padStart(2, '0')}${value}`;

/** CRC16-CCITT (polinômio 0x1021, inicial 0xFFFF), como exige o BR Code. */
export function crc16(payload: string) {
  let crc = 0xffff;
  for (let index = 0; index < payload.length; index += 1) {
    crc ^= payload.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1)
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Nome e cidade só aceitam letras sem acento, números e espaço. */
const plain = (text: string, max: number) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

/** Identificador da venda no Pix: até 25 letras/números (aparece no extrato). */
export function pixTxid(saleId: string) {
  const id = saleId.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return id ? `VENDA${id.slice(0, 20)}` : '***';
}

export function pixPayload({
  key,
  merchantName,
  merchantCity,
  amountCents,
  txid = '***',
}: {
  key: string;
  merchantName: string;
  merchantCity: string;
  /** Sem valor (0) o cliente digita; aqui sempre vai o valor da venda. */
  amountCents?: number;
  txid?: string;
}) {
  const account = field('00', 'br.gov.bcb.pix') + field('01', key);
  const amount =
    amountCents && amountCents > 0
      ? field('54', (amountCents / 100).toFixed(2))
      : '';
  const body =
    field('00', '01') +
    field('26', account) +
    field('52', '0000') +
    field('53', '986') +
    amount +
    field('58', 'BR') +
    field('59', plain(merchantName, 25) || 'RECEBEDOR') +
    field('60', plain(merchantCity, 15) || 'BRASIL') +
    field('62', field('05', txid.slice(0, 25))) +
    '6304';
  return body + crc16(body);
}
