import { cn } from '@/lib/utils';

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

export const BorderBeam = ({
  className,
  size = 200,
  duration = 15,
  borderWidth = 2,
  colorFrom = 'hsl(var(--primary))',
  colorTo = 'hsl(var(--accent))',
  delay = 0,
}: BorderBeamProps) => {
  return (
    <div
      style={
        {
          '--size': size,
          '--duration': duration,
          '--border-width': borderWidth,
          '--color-from': colorFrom,
          '--color-to': colorTo,
          '--delay': delay,
        } as React.CSSProperties
      }
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit]',

        // Border styles
        'border-[length:var(--border-width)px] border-transparent',

        // Pseudo elements for the animated border
        "before:absolute before:inset-0 before:rounded-[inherit] before:p-[var(--border-width)px] before:bg-[linear-gradient(to_right,var(--color-from),var(--color-to),var(--color-from))] before:animate-border-beam before:content-['']",

        className
      )}
    />
  );
};
