'use client';

import { ReactNode, SelectHTMLAttributes, useId } from 'react';

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: ReactNode;
  hint?: ReactNode;
};

type SelectControlProps = SelectHTMLAttributes<HTMLSelectElement> & {
  controlClassName?: string;
};

export function SelectControl({
  controlClassName,
  className,
  children,
  ...props
}: SelectControlProps) {
  return (
    <div
      className={`select-control${controlClassName ? ` ${controlClassName}` : ''}`}
    >
      <select {...props} className={className}>
        {children}
      </select>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m7 9.5 5 5 5-5" />
      </svg>
    </div>
  );
}

export function SelectField({
  label,
  hint,
  id,
  className,
  children,
  ...props
}: SelectFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = hint ? `${fieldId}-hint` : undefined;

  return (
    <div className="field select-field">
      <label htmlFor={fieldId}>{label}</label>
      <SelectControl
        {...props}
        id={fieldId}
        className={className}
        aria-describedby={props['aria-describedby'] ?? hintId}
      >
        {children}
      </SelectControl>
      {hint && <small id={hintId}>{hint}</small>}
    </div>
  );
}
