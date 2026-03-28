import React from "react"
/**
 * Badge — cv() class variant function
 */

import { cv, tw } from "tailwind-styled-v4"

const badgeVariants = cv({
  base: "inline-flex items-center gap-1.5 rounded-full font-medium",
  variants: {
    color: {
      gray:   "bg-gray-100 text-gray-700",
      blue:   "bg-blue-100 text-blue-700",
      green:  "bg-green-100 text-green-700",
      yellow: "bg-yellow-100 text-yellow-700",
      red:    "bg-red-100 text-red-700",
      purple: "bg-purple-100 text-purple-700",
    },
    size: {
      sm: "px-2 py-0.5 text-[10px]",
      md: "px-2.5 py-0.5 text-xs",
      lg: "px-3 py-1 text-sm",
    },
  },
  defaultVariants: {
    color: "gray",
    size: "md",
  },
})

const Dot = tw.span`h-1.5 w-1.5 rounded-full bg-current`

interface BadgeProps {
  color?: "gray" | "blue" | "green" | "yellow" | "red" | "purple"
  size?: "sm" | "md" | "lg"
  dot?: boolean
  className?: string
  children: React.ReactNode
}

export function Badge({ color, size, dot, className, children }: BadgeProps) {
  return (
    <span className={badgeVariants({ color, size, className })}>
      {dot && <Dot aria-hidden />}
      {children}
    </span>
  )
}
