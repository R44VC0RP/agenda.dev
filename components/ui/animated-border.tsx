"use client"

import { cn } from "@/lib/utils"

interface AnimatedBorderProps {
  className?: string
  solidColor?: string
  gradientColors?: string
}

export function AnimatedBorder({
  className,
  solidColor = "rgb(124, 90, 255)",
  gradientColors = "rgb(124, 90, 255), rgb(70, 174, 206), rgb(124, 90, 255)",
}: AnimatedBorderProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit]",
        "transition-all duration-300 ease-in-out",
        "border border-transparent",
        "group-focus-within:border-[var(--solid-color)]",
        "group-hover:before:opacity-100 group-focus-within:before:opacity-0",
        className
      )}
      style={{
        "--solid-color": solidColor,
        "--gradient-colors": gradientColors,
      } as React.CSSProperties}
    >
      {/* Animated gradient border on hover */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-0 transition-opacity duration-300 rounded-[inherit] overflow-hidden"
        style={{
          background: `linear-gradient(90deg, var(--gradient-colors))`,
          backgroundSize: "200% 100%",
          padding: "1px",
          animation: "animatedGradient 3s linear infinite",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
    </div>
  )
}