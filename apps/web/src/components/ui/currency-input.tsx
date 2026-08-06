"use client";

import { ReactNode, useId, useState } from "react";

type CurrencyInputProps = {
  label: ReactNode;
  name?: string;
  value?: string;
  defaultValue?: string | number;
  onValueChange?: (value: string) => void;
  required?: boolean;
  min?: number;
  max?: number;
  disabled?: boolean;
  hint?: ReactNode;
  placeholder?: string;
};

const formatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function normalize(value: string | number | undefined) {
  if (value === undefined || value === "") return "";
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : "";
}

function fromMaskedInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? (Number(digits) / 100).toFixed(2) : "";
}

export function CurrencyInput({ label, name, value, defaultValue, onValueChange, required, min, max, disabled, hint, placeholder = "R$ 0,00" }: CurrencyInputProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const [internalValue, setInternalValue] = useState(() => normalize(defaultValue));
  const decimalValue = value === undefined ? internalValue : normalize(value);
  const displayValue = decimalValue === "" ? "" : formatter.format(Number(decimalValue));

  function change(nextDisplayValue: string) {
    const nextValue = fromMaskedInput(nextDisplayValue);
    if (value === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  }

  return <div className="field currency-field">
    <label htmlFor={id}>{label}</label>
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={displayValue}
      onChange={event => change(event.target.value)}
      onBlur={event => {
        const number = Number(decimalValue || 0);
        event.currentTarget.setCustomValidity(
          required && !decimalValue ? "Informe um valor." :
          min !== undefined && number < min ? `O valor mínimo é ${formatter.format(min)}.` :
          max !== undefined && number > max ? `O valor máximo é ${formatter.format(max)}.` : "",
        );
      }}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      aria-describedby={hintId}
    />
    {name && <input type="hidden" name={name} value={decimalValue} />}
    {hint && <small id={hintId}>{hint}</small>}
  </div>;
}
