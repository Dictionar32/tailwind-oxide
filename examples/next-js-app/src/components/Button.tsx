import React from "react"
/**
 * Button — tw subcomponent pattern
 *
 * Usage:
 *   <PrimaryButton>
 *     <PrimaryButton.icon>🔵</PrimaryButton.icon>
 *     <PrimaryButton.text>Click me</PrimaryButton.text>
 *     <PrimaryButton.badge>New</PrimaryButton.badge>
 *   </PrimaryButton>
 */

import { tw, cx } from "tailwind-styled-v4"

// ── Base button dengan subcomponents ─────────────────────────────────────
export const Button = tw.button`
  relative inline-flex items-center gap-2 px-4 py-2 rounded-lg
  font-medium transition-all
  focus:ring-2 focus:ring-offset-2 focus:outline-none
  disabled:opacity-50 disabled:cursor-not-allowed

  icon {
    inline-block w-5 h-5 flex-shrink-0
  }

  text {
    inline-block
  }

  badge {
    absolute -top-2 -right-2
    inline-flex items-center justify-center
    min-w-5 h-5 px-1
    text-xs font-bold text-white bg-red-500 rounded-full
  }
`

// ── Variants ─────────────────────────────────────────────────────────────
export const PrimaryButton = Button.extend`
  bg-indigo-600 text-white
  hover:bg-indigo-700 hover:scale-105
  focus:ring-indigo-500
  disabled:hover:scale-100
`

export const SecondaryButton = Button.extend`
  bg-gray-200 text-gray-800
  hover:bg-gray-300
  focus:ring-gray-400
`

export const DangerButton = Button.extend`
  bg-red-600 text-white
  hover:bg-red-700 hover:scale-105
  focus:ring-red-500
  disabled:hover:scale-100
`

export const OutlineButton = Button.extend`
  border-2 border-indigo-500 text-indigo-600 bg-transparent
  hover:bg-indigo-500 hover:text-white
  focus:ring-indigo-500
`

// ── Ghost variant ────────────────────────────────────────────────────────
export const GhostButton = tw.button`
  relative inline-flex items-center gap-2 px-4 py-2 rounded-lg
  font-medium transition-all
  text-gray-600 hover:bg-gray-100 hover:text-gray-900
  focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:outline-none
  disabled:opacity-50 disabled:cursor-not-allowed

  icon {
    inline-block w-5 h-5 flex-shrink-0
  }

  text {
    inline-block
  }
`
