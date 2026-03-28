import React from "react"
/**
 * Avatar — tw.server (RSC-only) + tw template literal + size props
 *
 * tw.server → compiler enforced server-only, dev warning jika render di browser
 *
 * Contoh penggunaan:
 *   <Avatar name="John Doe" size="md" />
 *   <Avatar name="Jane" src="/photo.jpg" size="lg" />
 *   <AvatarGroup users={[...]} max={4} />
 */

import { tw, server, cn } from "tailwind-styled-v4"

// ── tw.server — server-only component ─────────────────────────────────────────
const AvatarRoot = server.div`
  relative inline-flex shrink-0 items-center justify-center
  rounded-full font-semibold select-none overflow-hidden
`

// ── tw untuk fallback initials + image ────────────────────────────────────────
const AvatarImage = tw.img`h-full w-full object-cover`

const AvatarFallback = tw.span`absolute inset-0 flex items-center justify-center`

// ── Size map ──────────────────────────────────────────────────────────────────
const sizeMap = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
}

// ── Color from name (deterministic) ──────────────────────────────────────────
const colorPalette = [
  "bg-red-100 text-red-700",
  "bg-orange-100 text-orange-700",
  "bg-amber-100 text-amber-700",
  "bg-green-100 text-green-700",
  "bg-teal-100 text-teal-700",
  "bg-blue-100 text-blue-700",
  "bg-indigo-100 text-indigo-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
]

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

function getColor(name: string): string {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return colorPalette[hash % colorPalette.length]
}

// ── Avatar ────────────────────────────────────────────────────────────────────
interface AvatarProps {
  name: string
  src?: string
  size?: keyof typeof sizeMap
  className?: string
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const initials = getInitials(name)
  const color = getColor(name)

  return (
    <AvatarRoot className={cn(sizeMap[size], !src && color, className)} title={name}>
      {src ? (
        <AvatarImage src={src} alt={name} />
      ) : (
        <AvatarFallback>{initials}</AvatarFallback>
      )}
    </AvatarRoot>
  )
}

// ── AvatarGroup ───────────────────────────────────────────────────────────────
const GroupRoot = tw.div`flex -space-x-2`
const Overflow = server.div`
  relative inline-flex shrink-0 items-center justify-center
  rounded-full bg-gray-200 text-gray-600 font-semibold ring-2 ring-white
`

interface AvatarGroupProps {
  users: { name: string; src?: string }[]
  max?: number
  size?: keyof typeof sizeMap
}

export function AvatarGroup({ users, max = 5, size = "md" }: AvatarGroupProps) {
  const visible = users.slice(0, max)
  const overflow = users.length - max

  return (
    <GroupRoot>
      {visible.map((u) => (
        <div key={u.name} className="ring-2 ring-white rounded-full">
          <Avatar name={u.name} src={u.src} size={size} />
        </div>
      ))}
      {overflow > 0 && (
        <Overflow className={cn(sizeMap[size], "text-xs ring-2 ring-white")}>
          +{overflow}
        </Overflow>
      )}
    </GroupRoot>
  )
}
