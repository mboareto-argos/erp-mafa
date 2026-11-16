'use client';

import Link from 'next/link';
import { Calculator, ChevronLeft, Minus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Moldura dos fluxos de registro em tela cheia (DS §8.10): Nova venda,
// Nova compra... Uma etapa por vez, progresso em linguagem de tarefa e o
// total + ação principal sempre visíveis no rodapé. A barra inferior do
// celular some nessas rotas (FOCUS_ROUTES em mobile-navigation.tsx).

export function TaskFlow({ children }: { children: React.ReactNode }) {
  return (
    <main className="task-flow page-content flex min-h-[calc(100dvh-60px)] flex-col !pb-0 sm:min-h-[calc(100dvh-72px)]">
      {children}
    </main>
  );
}

export function TaskFlowHeader({
  eyebrow,
  title,
  closeHref,
  closeLabel,
  actions,
}: {
  eyebrow: string;
  title: string;
  closeHref: string;
  closeLabel: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wide text-brand-accent-hover uppercase">
          {eyebrow}
        </p>
        <h1 className="text-xl font-semibold text-neutral-900 sm:text-2xl">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-1">
        {actions}
        <Button asChild variant="tertiary" size="icon" aria-label={closeLabel}>
          <Link href={closeHref}>
            <X aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </header>
  );
}

export function TaskFlowSteps({
  steps,
  current,
  label,
}: {
  steps: readonly string[];
  current: number;
  label: string;
}) {
  return (
    <ol
      className="mb-5 grid gap-2"
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      aria-label={label}
    >
      {steps.map((step, index) => (
        <li key={step} aria-current={index === current ? 'step' : undefined}>
          <span
            className={cn(
              'block h-1.5 rounded-full bg-neutral-100',
              index <= current && 'bg-brand-accent',
            )}
          />
          <span
            className={cn(
              'mt-1.5 block truncate text-xs font-semibold text-neutral-500',
              index === current && 'text-neutral-900',
            )}
          >
            {step}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function TaskFlowFooter({
  error,
  onBack,
  backDisabled,
  summaryLabel,
  summaryValue,
  children,
}: {
  error?: string;
  onBack?: () => void;
  backDisabled?: boolean;
  summaryLabel: string;
  summaryValue: string;
  /** Ação principal (um único botão primário — DS-BTN-001). */
  children: React.ReactNode;
}) {
  return (
    <footer className="sticky bottom-0 z-20 -mx-4.5 mt-auto border-t border-neutral-100 bg-neutral-0/95 px-4.5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur sm:-mx-8 sm:px-8">
      {error && (
        <p
          role="alert"
          className="mb-2 rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-600"
        >
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        {onBack && (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="px-3"
            onClick={onBack}
            disabled={backDisabled}
            aria-label="Voltar uma etapa"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <span className="block truncate text-xs text-neutral-500">
            {summaryLabel}
          </span>
          <strong className="block truncate text-lg font-bold text-neutral-900 tabular-nums sm:text-2xl">
            {summaryValue}
          </strong>
        </div>
        {children}
      </div>
    </footer>
  );
}

/**
 * Valor calculado pelo sistema: visualmente diferente de campo digitável
 * (DS-FORM-004) — fundo neutro, ícone de calculadora, sem borda de input.
 */
export function CalculatedBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 rounded-md bg-neutral-50 p-3 text-sm">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
        <Calculator className="size-4" aria-hidden="true" />
        {title} · calculado
      </span>
      {children}
    </div>
  );
}

export function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-neutral-700">{label}</span>
      <span
        className={cn(
          'tabular-nums text-neutral-900',
          strong && 'text-lg font-bold',
        )}
      >
        {value}
      </span>
    </div>
  );
}

/** Contador − / + com alvo de toque de 44px (DS §4.6). */
export function Stepper({
  value,
  onChange,
  min = 1,
  max,
  label,
  decreaseLabel,
  increaseLabel,
  removeLabel,
  format = String,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  /** Nome do grupo para leitor de tela (ex.: "Quantidade de Yara"). */
  label: string;
  decreaseLabel: string;
  increaseLabel: string;
  /** Quando informado, no mínimo o "−" vira "remover" (vai a zero). */
  removeLabel?: string;
  format?: (value: number) => string;
}) {
  const removing = removeLabel !== undefined && value <= min;
  return (
    <div
      className="flex w-fit items-center rounded-full border border-neutral-200"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className="grid size-11 place-items-center rounded-full text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
        disabled={!removing && value <= min}
        onClick={() => onChange(removing ? 0 : value - 1)}
        aria-label={removing ? removeLabel : decreaseLabel}
      >
        {removing ? (
          <X className="size-5" aria-hidden="true" />
        ) : (
          <Minus className="size-5" aria-hidden="true" />
        )}
      </button>
      <span
        className="min-w-8 px-1 text-center text-md font-semibold tabular-nums"
        aria-live="polite"
      >
        {format(value)}
      </span>
      <button
        type="button"
        className="grid size-11 place-items-center rounded-full text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
        disabled={max !== undefined && value >= max}
        onClick={() => onChange(value + 1)}
        aria-label={increaseLabel}
      >
        <Plus className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}
