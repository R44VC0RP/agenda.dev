'use client';

import { cn } from '@/lib/utils';

interface BorderBeamMaskProps {
  className?: string;
  borderColor?: string;
}

export const BorderBeamMask = ({
  className,
  borderColor = 'rgb(124, 90, 255)',
}: BorderBeamMaskProps) => {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden',
        className
      )}
      style={{
        boxShadow: `inset 0 0 0 1px ${borderColor}`,
      }}
    />
  );
};
