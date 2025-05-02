'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface BorderBeamInteractiveProps {
  className?: string;
  borderColor?: string;
  hoverGradient?: string;
  duration?: number;
}

export const BorderBeamInteractive = ({
  className,
  borderColor = 'var(--border-color-custom, hsl(var(--primary)))',
  hoverGradient = 'var(--hover-gradient-custom, linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary))))',
  duration = 3,
}: BorderBeamInteractiveProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit] transition-all duration-300',

        // No styles by default (no border or animation when neither hovering nor focused)

        // Apply different styles for hover vs focus states
        "before:absolute before:inset-0 before:rounded-[inherit] before:p-[2px] before:content-[''] before:opacity-0",
        'group-hover:before:opacity-100 group-focus-within:before:opacity-0', // Show gradient on hover only
        'before:bg-[--hover-gradient] before:bg-[length:200%_100%] before:transition-all before:duration-300',
        'group-hover:animate-border-flow', // Animation class (controlled by CSS)

        // Solid border when focused
        "after:absolute after:inset-0 after:rounded-[inherit] after:p-[2px] after:content-[''] after:opacity-0",
        'after:border after:border-[--border-color] after:box-border',
        'group-focus-within:after:opacity-100', // Show solid border on focus only
        'after:transition-opacity after:duration-300',

        className
      )}
      style={
        {
          '--border-color': borderColor,
          '--hover-gradient': hoverGradient,
          '--animation-duration': `${duration}s`,
        } as React.CSSProperties
      }
    />
  );
};
