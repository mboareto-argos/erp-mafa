-- Fase 3 — financeiro real (BR §10.13, regras 8 a 11). Migration só
-- aditiva: código antigo segue funcionando (contas existentes viram "store").
--   kind = owner  → conta do proprietário (dinheiro pessoal usado na loja)
--   opening_balance / balance_adjustment / owner_contribution → novas
--   origens de movimentação; nenhuma é receita nem despesa.
CREATE TYPE "FinancialAccountKind" AS ENUM ('store', 'owner');

ALTER TABLE "financial_accounts" ADD COLUMN "kind" "FinancialAccountKind" NOT NULL DEFAULT 'store';

ALTER TYPE "FinancialTransactionOriginType" ADD VALUE 'opening_balance';
ALTER TYPE "FinancialTransactionOriginType" ADD VALUE 'balance_adjustment';
ALTER TYPE "FinancialTransactionOriginType" ADD VALUE 'owner_contribution';
