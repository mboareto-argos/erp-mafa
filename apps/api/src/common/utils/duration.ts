// Formato aceito pelas variaveis JWT_*_EXPIRES_IN e por JwtSignOptions.expiresIn.
export type JwtDuration = `${number}${'s' | 'm' | 'h' | 'd'}`;

const UNIT_TO_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

// Converte durações simples ("15m", "30d") usadas nas expirações de token
// (env JWT_*_EXPIRES_IN) para milissegundos.
export function parseDurationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) {
    throw new Error(
      `Duração inválida: "${duration}" (use algo como "15m" ou "30d")`,
    );
  }
  const [, amount, unit] = match;
  return Number(amount) * UNIT_TO_MS[unit];
}
