import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";

export default function LoginPage() {
  return <main className="auth-page"><aside className="auth-aside"><Link className="brand" href="/"><span className="brand-mark">M</span> MAFA Store</Link><div><h1>Controle sua loja sem depender de planilhas.</h1><p>Vendas, estoque e dinheiro em um só lugar — simples de usar no celular ou computador.</p></div><small>ERP simplificado para pequenos vendedores.</small></aside><section className="auth-content"><div className="auth-card"><h2>Entrar no sistema</h2><p>Informe seus dados para acessar sua empresa.</p><LoginForm /><p className="auth-footer">Ainda não tem conta? <Link className="text-link" href="/cadastro">Criar conta</Link></p></div></section></main>;
}
