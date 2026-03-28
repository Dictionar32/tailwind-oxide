import React from "react"
/**
 * Card — tw template literal + tw(Component) extend pattern
 *
 * Contoh penggunaan:
 *   <Card>...</Card>
 *   <Card hoverable>...</Card>
 *   <CardHeader><CardTitle>Title</CardTitle></CardHeader>
 *   <CardBody>content</CardBody>
 *   <CardFooter>footer</CardFooter>
 */

import { tw, cn } from "tailwind-styled-v4"

// ── Base card ─────────────────────────────────────────────────────────────────
const CardBase = tw.article`
  rounded-2xl border border-gray-200 bg-white shadow-sm
  overflow-hidden
`

// ── tw(Component) — extend CardBase dengan class tambahan ─────────────────────
const CardHoverable = tw(CardBase)`
  transition-all duration-200
  hover:-translate-y-1 hover:shadow-md hover:border-indigo-200
`

// ── Sub-components ────────────────────────────────────────────────────────────
export const CardHeader = tw.div`
  px-6 pt-5 pb-0 flex items-start justify-between gap-3
`

export const CardTitle = tw.h3`
  text-base font-semibold text-gray-900 leading-snug
`

export const CardBadge = tw.span`
  shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold
  bg-indigo-100 text-indigo-700
`

export const CardBody = tw.div`
  px-6 py-4 text-sm text-gray-500 leading-relaxed
`

export const CardFooter = tw.div`
  px-6 pb-5 pt-0 flex items-center gap-2
`

// ── Card wrapper — switch antara base dan hoverable ────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLElement> {
  hoverable?: boolean
  children: React.ReactNode
}

export function Card({ hoverable = false, className, children, ...props }: CardProps) {
  const Component = hoverable ? CardHoverable : CardBase
  return (
    <Component className={cn(className)} {...props}>
      {children}
    </Component>
  )
}
