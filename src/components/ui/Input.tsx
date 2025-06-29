import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="input-label">
            {label}
          </label>
        )}
        <input
          id={inputId}
          className={cn('input', error && 'border-red-300 focus:ring-red-500 focus:border-red-500', className)}
          ref={ref}
          {...props}
        />
        {error && <p className="input-error">{error}</p>}
        {helperText && !error && <p className="input-helper">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input; 