'use client';

import { cn } from '@/lib/utils';

interface AnimatedBorderProps {
  className?: string;
  solidColor?: string;
  gradientColors?: string;
}

export function AnimatedBorder({
  className,
  solidColor = 'hsl(var(--primary))',
  gradientColors = 'hsl(var(--primary)/0.9), hsl(var(--accent)/0.9), hsl(var(--primary)/0.9)',
}: AnimatedBorderProps) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Solid border that shows only when focused */}
      <div
        className={cn(
          'absolute inset-0 rounded-[12px]',
          'border border-solid transition-opacity duration-300',
          'group-focus-within:opacity-100 opacity-0',
          className
        )}
        style={{
          borderColor: solidColor,
          borderWidth: '2px',
          zIndex: 10,
          boxSizing: 'border-box',
        }}
      />

      {/* Animated gradient border that shows only on hover when not focused */}
      <div
        className={cn(
          'animated-gradient-border',
          'absolute inset-0 rounded-[12px]',
          'transition-opacity duration-300 overflow-hidden',
          'group-hover:opacity-100 group-focus-within:opacity-0 opacity-0',
          className
        )}
        style={{
          background: `linear-gradient(90deg, ${gradientColors})`,
          backgroundSize: '200% 100%',
          padding: '2px',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          zIndex: 5,
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}
