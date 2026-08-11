import { InvitationAcceptForm } from '@/components/settings/invitation-accept-form';
import { backendRequest } from '@/lib/session';

type Invitation = {
  email: string;
  expiresAt: string;
  company: { name: string };
  role: { name: string };
} | null;

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = (await backendRequest(`/invitations/${token}`).catch(
    () => null,
  )) as Invitation;
  return (
    <main className="auth-page">
      <aside className="auth-aside">
        <span className="brand">
          <span className="brand-mark">M</span> MAFA Store
        </span>
        <div>
          <h1>Você foi convidado para organizar a operação.</h1>
          <p>Seu acesso respeitará o perfil definido pela empresa.</p>
        </div>
        <small>Dados e permissões sempre separados por empresa.</small>
      </aside>
      <section className="auth-content">
        <div className="auth-card">
          {invitation ? (
            <>
              <h2>Entrar na {invitation.company.name}</h2>
              <p>
                Convite enviado para <strong>{invitation.email}</strong>.
              </p>
              <InvitationAcceptForm token={token} />
            </>
          ) : (
            <>
              <h2>Convite indisponível</h2>
              <p>
                Este link expirou ou já foi utilizado. Solicite um novo convite
                ao administrador.
              </p>
              <a className="button button-secondary" href="/entrar">
                Ir para o login
              </a>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
