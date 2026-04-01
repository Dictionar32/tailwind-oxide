import React from "react"
/**
 * Card — tw subcomponent pattern
 *
 * Usage:
 *   <Card>
 *     <Card.header>
 *       <Card.title>Title</Card.title>
 *       <Card.badge>New</Card.badge>
 *     </Card.header>
 *     <Card.body>Content here</Card.body>
 *     <Card.footer>Footer</Card.footer>
 *   </Card>
 *
 *   <Card hoverable>
 *     <Card.image src="/img.jpg" alt="..." />
 *     <Card.body>Hoverable card</Card.body>
 *   </Card>
 */

import { tw, cn } from "tailwind-styled-v4"

// ── Base card dengan subcomponents ───────────────────────────────────────
export const Card = tw.article`
  rounded-2xl border border-gray-200 bg-white shadow-sm
  overflow-hidden

  header {
    px-6 pt-5 pb-0 flex items-start justify-between gap-3
  }

  title {
    text-base font-semibold text-gray-900 leading-snug
  }

  badge {
    shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold
    bg-indigo-100 text-indigo-700
  }

  body {
    px-6 py-4 text-sm text-gray-500 leading-relaxed
  }

  footer {
    px-6 pb-5 pt-0 flex items-center gap-2
  }

  image {
    w-full aspect-video object-cover
  }
`

// ── Hoverable variant ────────────────────────────────────────────────────
export const HoverableCard = Card.extend`
  transition-all duration-200
  hover:-translate-y-1 hover:shadow-md hover:border-indigo-200
`

// ── Primary variant ──────────────────────────────────────────────────────
export const PrimaryCard = Card.extend`
  border-blue-200
  header { bg-blue-50 border-b border-blue-100 }
  title { text-blue-800 }
  body { text-blue-700 }
`

// ── Wrapper function untuk switch antara base/hoverable ──────────────────
interface CardWrapperProps extends React.HTMLAttributes<HTMLElement> {
  hoverable?: boolean
  children: React.ReactNode
}

export function CardWrapper({ hoverable = false, className, children, ...props }: CardWrapperProps) {
  const Component = hoverable ? HoverableCard : Card
  return (
    <Component className={cn(className)} {...props}>
      {children}
    </Component>
  )
}
