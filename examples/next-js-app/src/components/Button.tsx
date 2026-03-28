import React from "react"
/**
 * Button — cv() dengan variants + compoundVariants
 *
 * Contoh penggunaan:
 *   <Button>Default</Button>
 *   <Button variant="outline" size="lg">Outline Large</Button>
 *   <Button variant="ghost" size="sm" disabled>Ghost Small Disabled</Button>
 *   <Button variant="danger" loading>Deleting...</Button>
 */

import { cv, tw } from "tailwind-styled-v4"

// ── cv() — class variant function ─────────────────────────────────────────────
const buttonVariants = cv({
  base: "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  variants: {
    variant: {
      default: "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500",
      outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-400",
      ghost:   "text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-400",
      danger:  "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
    },
    size: {
      sm: "h-8 px-3 text-xs",
      md: "h-9 px-4 text-sm",
      lg: "h-11 px-6 text-base",
    },
  },
  compoundVariants: [
    // outline + danger = special compound
    { variant: "outline", size: "lg", class: "font-semibold" },
  ],
  defaultVariants: {
    variant: "default",
    size: "md",
  },
})

// ── tw component untuk spinner ────────────────────────────────────────────────
const Spinner = tw.span`
  h-4 w-4 animate-spin rounded-full
  border-2 border-current border-t-transparent
`

// ── Props ─────────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
  loading?: boolean
  children: React.ReactNode
}

export function Button({
  variant,
  size,
  loading,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonVariants({ variant, size, className })}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner aria-hidden />}
      {children}
    </button>
  )
}
