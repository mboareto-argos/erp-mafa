import { CompanySelector } from '@/components/auth/company-selector';
import Link from 'next/link';

export default function SelectCompanyPage() {
  return (
    <main className="auth-page">
      <aside className="auth-aside">
        <Link className="brand" href="/">
          <span className="brand-mark">M</span> MAFA Store
        </Link>
        <div>
          <h1>Escolha a empresa que você quer acessar.</h1>
          <p>Seus dados ficam sempre separados por empresa.</p>
        </div>
        <small>Você poderá trocar de empresa pelo menu superior.</small>
      </aside>
      <section className="auth-content">
        <div className="auth-card">
          <h2>Qual empresa vamos abrir?</h2>
          <p>
            Seu acesso e as informações exibidas seguem o seu perfil nesta
            empresa.
          </p>
          <CompanySelector />
          <Link className="text-link" href="/entrar">
            Voltar para entrar
          </Link>
        </div>
      </section>
    </main>
  );
}
