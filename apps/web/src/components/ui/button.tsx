import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Botões do Design System (§8.1): primário (acento da empresa), secundário
// (contorno), terciário (texto) e destrutivo; tamanhos sm 32px, md 40px,
// lg 48px. Foco sempre visível; carregando troca o texto por spinner sem
// mudar a largura.
export const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-brand-accent text-neutral-950 hover:bg-brand-accent-hover active:bg-brand-accent-hover',
        secondary:
          'border border-neutral-200 bg-neutral-0 text-neutral-900 hover:bg-neutral-50',
        tertiary: 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900',
        destructive: 'bg-danger-600 text-neutral-0 hover:opacity-90',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-5 text-md',
        icon: 'size-11',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);
  if (asChild)
    return (
      <Slot className={classes} {...props}>
        {children}
      </Slot>
    );
  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <span className="invisible inline-flex items-center gap-2">
            {children}
          </span>
          <Loader2 className="absolute animate-spin" aria-hidden="true" />
          <span className="sr-only">Carregando</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
