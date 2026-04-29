import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus-ring disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const variants = {
      primary: 'bg-accent hover:bg-accent-hover text-background',
      ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface-hover',
      outline: 'border border-border hover:border-border-hover text-text-secondary hover:text-text-primary hover:bg-surface-hover',
      danger: 'bg-priority-urgent/10 hover:bg-priority-urgent/20 text-priority-urgent border border-priority-urgent/30',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-5 py-2.5',
      icon: 'p-2',
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
