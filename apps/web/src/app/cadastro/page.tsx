import Link from 'next/link';
import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <aside className="auth-aside">
        <Link className="brand" href="/">
          <span className="brand-mark">M</span> MAFA Store
        </Link>
        <div>
          <h1>Vamos organizar sua loja.</h1>
          <p>
            Crie a empresa, cadastre os produtos e comece a registrar a operação
            em um só lugar.
          </p>
        </div>
        <small>Você será o proprietário da nova empresa.</small>
      </aside>
      <section className="auth-content">
        <div className="auth-card">
          <h2>Crie sua conta</h2>
          <p>Leva menos de um minuto para começar.</p>
          <RegisterForm />
          <p className="auth-footer">
            Já tem acesso?{' '}
            <Link className="text-link" href="/entrar">
              Entrar
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
