import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-button",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-b from-[#7c5aff] to-[#6c47ff] text-white dark:from-[#8d6dff] dark:to-[#7c5aff] hover:from-[#8f71ff] hover:to-[#7c5aff] active:from-[#6c47ff] active:to-[#5835ff] dark:shadow-accent",
        destructive: "bg-gradient-to-b from-red-500 to-red-600 text-white dark:from-red-500 dark:to-red-600 hover:from-red-400 hover:to-red-500 active:from-red-600 active:to-red-700",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground dark:border-gray-700 dark:hover:border-gray-600",
        secondary: "bg-transparent text-foreground dark:text-foreground hover:bg-accent/20 dark:hover:bg-white/10",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10",
        link: "text-primary underline-offset-4 hover:underline dark:text-[#8d6dff]",
        icon: "h-8 w-8 p-0",
      },
      size: {
        default: "h-8 px-4 py-1.5",
        sm: "h-7 px-3 text-xs",
        lg: "h-10 px-6",
        icon: "h-8 w-8",
      },
      weight: {
        default: "font-normal",
        medium: "font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      weight: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, weight, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, weight, className }))} ref={ref} {...props} />
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
