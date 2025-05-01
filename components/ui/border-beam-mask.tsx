"use client"

import { cn } from "@/lib/utils"

interface BorderBeamMaskProps {
  className?: string
  borderColor?: string
}

export const BorderBeamMask = ({
  className,
  borderColor = "rgba(124, 90, 255, 0.5)",
}: BorderBeamMaskProps) => {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden",
        className
      )}
      style={{
        boxShadow: `0 0 0 1px ${borderColor}`,
      }}
    />
  )
}