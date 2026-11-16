/** Só caminhos internos (evita open redirect via ?next=https://...). */
export function safeNext(next: string | null) {
  return next &&
    next.startsWith('/') &&
    !next.startsWith('//') &&
    !next.startsWith('/\\') &&
    !next.startsWith('/api/')
    ? next
    : '/inicio';
}
