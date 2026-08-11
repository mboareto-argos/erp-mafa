'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function InvitationAcceptForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/invitations/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          password: data.get('password'),
        }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(
          payload.message ?? 'Não foi possível aceitar o convite.',
        );
      router.push('/entrar?invitation=accepted');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível aceitar o convite.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="invite-name">Seu nome</label>
        <input id="invite-name" name="name" required minLength={2} />
      </div>
      <div className="field">
        <label htmlFor="invite-password">Crie uma senha</label>
        <input
          id="invite-password"
          name="password"
          type="password"
          required
          minLength={8}
        />
        <small>Use pelo menos 8 caracteres.</small>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button button-primary" disabled={pending}>
        {pending ? 'Ativando acesso…' : 'Aceitar convite'}
      </button>
    </form>
  );
}
