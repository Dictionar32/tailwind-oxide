"use client"
import React from "react"

/**
 * Alert — cx() conditional class merge + tw template literal
 *
 * Contoh penggunaan:
 *   <Alert type="info" title="Info">Pesan info</Alert>
 *   <Alert type="success" title="Sukses!" dismissible>Berhasil disimpan</Alert>
 *   <Alert type="warning">Perhatian tanpa title</Alert>
 *   <Alert type="error" title="Error">Gagal memuat data</Alert>
 */

import { useState } from "react"
import { tw, cx } from "tailwind-styled-v4"

// ── tw template literal ───────────────────────────────────────────────────────
const AlertRoot = tw.div`
  relative flex gap-3 rounded-xl border p-4 text-sm
  icon{
    mt-0.5 shrink-0 leading-non
  }
`

const AlertIcon = tw.span`mt-0.5 shrink-0 text-lg leading-none`
const AlertContent = tw.div`flex-1 min-w-0`
const AlertTitle = tw.p`font-semibold leading-snug`
const AlertBody = tw.p`mt-0.5 leading-relaxed opacity-80`
const DismissButton = tw.button`
  ml-auto -mr-1 -mt-1 rounded-lg p-1
  opacity-60 hover:opacity-100 transition-opacity
`

// ── color maps ────────────────────────────────────────────────────────────────
const colorMap = {
  info:    { root: "border-blue-200 bg-blue-50 text-blue-800",   icon: "ℹ️" },
  success: { root: "border-green-200 bg-green-50 text-green-800", icon: "✅" },
  warning: { root: "border-yellow-200 bg-yellow-50 text-yellow-800", icon: "⚠️" },
  error:   { root: "border-red-200 bg-red-50 text-red-800",       icon: "❌" },
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface AlertProps {
  type?: "info" | "success" | "warning" | "error"
  title?: string
  dismissible?: boolean
  className?: string
  children: React.ReactNode
}

export function Alert({
  type = "info",
  title,
  dismissible = false,
  className,
  children,
}: AlertProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const { root, icon } = colorMap[type]

  return (
    // cx() — merge base classes dengan conditional color classes
    <AlertRoot className={cx(root, className)}>

      <AlertRoot.icon>{icon}</AlertRoot.icon>
      <AlertContent>
        {title && <AlertTitle>{title}</AlertTitle>}
        <AlertBody>{children}</AlertBody>
      </AlertContent>
      {dismissible && (
        <DismissButton onClick={() => setDismissed(true)} aria-label="Tutup">
          ✕
        </DismissButton>
      )}
    </AlertRoot>
  )
}
