import { z } from 'zod';

const onlyDigits = (value: string) => value.replace(/\D/g, '');

function validCpf(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    const sum = [...cpf.slice(0, length)].reduce(
      (total, char, index) => total + Number(char) * (length + 1 - index),
      0,
    );
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

function validCnpj(cnpj: string) {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const digit = (length: number) => {
    const weights =
      length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce(
      (total, weight, index) => total + Number(cnpj[index]) * weight,
      0,
    );
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return digit(12) === Number(cnpj[12]) && digit(13) === Number(cnpj[13]);
}

/**
 * Normaliza a chave Pix no formato que o BR Code exige (BR §10.12, regra 8):
 * CPF/CNPJ só dígitos, telefone +55DDDNÚMERO, e-mail e chave aleatória em
 * minúsculas. Devolve null quando a chave não é válida para o tipo.
 */
export function normalizePixKey(type: PixKeyType, raw: string) {
  const value = raw.trim();
  switch (type) {
    case 'cpf': {
      const digits = onlyDigits(value);
      return validCpf(digits) ? digits : null;
    }
    case 'cnpj': {
      const digits = onlyDigits(value);
      return validCnpj(digits) ? digits : null;
    }
    case 'phone': {
      let digits = onlyDigits(value);
      if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
      return /^55\d{10,11}$/.test(digits) ? `+${digits}` : null;
    }
    case 'email': {
      const email = value.toLowerCase();
      return email.length <= 77 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? email
        : null;
    }
    case 'random': {
      const key = value.toLowerCase();
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        key,
      )
        ? key
        : null;
    }
  }
}

export const pixKeyTypes = ['cpf', 'cnpj', 'phone', 'email', 'random'] as const;
export type PixKeyType = (typeof pixKeyTypes)[number];

// key = null remove a chave Pix da forma de pagamento.
export const setPixKeySchema = z.union([
  z.object({ key: z.null() }).strict(),
  z
    .object({
      keyType: z.enum(pixKeyTypes),
      key: z.string().trim().min(1, 'Informe a chave Pix.').max(100),
      // O BR Code aceita até 25 caracteres no nome e 15 na cidade.
      merchantName: z
        .string()
        .trim()
        .min(1, 'Informe o nome de quem recebe.')
        .max(25, 'Use até 25 letras no nome.'),
      merchantCity: z
        .string()
        .trim()
        .min(1, 'Informe a cidade.')
        .max(15, 'Use até 15 letras na cidade.'),
    })
    .strict(),
]);

export type SetPixKeyDto = z.infer<typeof setPixKeySchema>;
