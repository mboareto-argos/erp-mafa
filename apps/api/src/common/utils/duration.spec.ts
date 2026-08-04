import { parseDurationToMs } from './duration';

describe('parseDurationToMs', () => {
  it('converte minutos, horas e dias corretamente', () => {
    expect(parseDurationToMs('15m')).toBe(15 * 60_000);
    expect(parseDurationToMs('1h')).toBe(3_600_000);
    expect(parseDurationToMs('30d')).toBe(30 * 86_400_000);
  });

  it('rejeita formatos inválidos', () => {
    expect(() => parseDurationToMs('15')).toThrow();
    expect(() => parseDurationToMs('abc')).toThrow();
    expect(() => parseDurationToMs('15 minutes')).toThrow();
  });
});
