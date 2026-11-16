import { describe, expect, it } from 'vitest';
import {
  absoluteUrl,
  messageWithImage,
  personalize,
  whatsappLink,
  whatsappNumber,
} from './campaigns';

describe('campanhas', () => {
  it('personaliza com o primeiro nome e some com o marcador na lista de transmissão', () => {
    const message = 'Oi {nome}! Chegou Yara 🎁';
    expect(personalize(message, 'Ana Paula Souza')).toBe(
      'Oi Ana! Chegou Yara 🎁',
    );
    expect(personalize(message)).toBe('Oi! Chegou Yara 🎁');
    expect(personalize('{nome}, tem novidade', undefined)).toBe(
      ', tem novidade',
    );
  });

  it('número do WhatsApp: põe o 55 em número brasileiro e recusa inválido', () => {
    expect(whatsappNumber('(11) 99999-0001')).toBe('5511999990001');
    expect(whatsappNumber('11 3333-4444')).toBe('551133334444');
    expect(whatsappNumber('+55 11 99999-0001')).toBe('5511999990001');
    expect(whatsappNumber('1199')).toBeNull();
    expect(whatsappNumber(null)).toBeNull();
  });

  it('link do wa.me com o texto e a foto como link', () => {
    const text = messageWithImage(
      'Oi Ana!',
      'https://x.public.blob.vercel-storage.com/a.jpg',
    );
    expect(whatsappLink('5511999990001', text)).toBe(
      'https://wa.me/5511999990001?text=Oi%20Ana!%0A%0Ahttps%3A%2F%2Fx.public.blob.vercel-storage.com%2Fa.jpg',
    );
    expect(absoluteUrl('/uploads/a.jpg', 'http://localhost:3000')).toBe(
      'http://localhost:3000/uploads/a.jpg',
    );
  });
});
