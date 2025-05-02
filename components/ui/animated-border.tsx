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
    <div className="pointer-events-none absolute inset-0">
      {/* This CSS ensures consistent behavior */}
      <style jsx global>{`
        .group:focus-within {
          --border-visible: 1;
          --animation-visible: 0;
        }
        
        .group:hover:not(:focus-within) {
          --border-visible: 0;
          --animation-visible: 1;
        }
        
        .group:not(:hover):not(:focus-within) {
          --border-visible: 0;
          --animation-visible: 0;
        }
      `}</style>
      
      {/* Solid border that shows only when focused */}
      <div
        className={cn(
          "absolute inset-0 rounded-[12px]",
          "border border-solid transition-opacity duration-300",
          className
        )}
        style={{
          borderColor: solidColor,
          borderWidth: "1.5px",
          opacity: "var(--border-visible, 0)",
          zIndex: 10,
          boxSizing: "border-box",
        }}
      />
      
      {/* Animated gradient border that shows only on hover when not focused */}
      <div 
        className={cn(
          "absolute inset-0 rounded-[12px]",
          "transition-opacity duration-300 overflow-hidden",
          className
        )}
        style={{
          background: `linear-gradient(90deg, ${gradientColors})`,
          backgroundSize: "200% 100%",
          padding: "1px",
          opacity: "var(--animation-visible, 0)",
          animation: "animatedGradient 3s linear infinite",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          zIndex: 5,
          boxSizing: "border-box",
        }}
      />
    </div>
  )
}