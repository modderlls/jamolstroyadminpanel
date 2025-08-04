import type React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface IOSButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "ghost"
  size?: "sm" | "md" | "lg"
  loading?: boolean
  children: React.ReactNode
}

export function IOSButton({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: IOSButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 ios-spring active:scale-95 disabled:opacity-50 disabled:pointer-events-none"

  const variants = {
    primary: "bg-primary text-primary-foreground shadow-lg hover:shadow-xl",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "bg-destructive text-destructive-foreground shadow-lg hover:shadow-xl",
    ghost: "hover:bg-accent hover:text-accent-foreground",
  }

  const sizes = {
    sm: "h-9 px-4 text-sm",
    md: "h-11 px-6 text-base",
    lg: "h-14 px-8 text-lg",
  }

  return (
    <button
      className={cn(baseClasses, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  )
}
