/**
 * tailwind-styled-v4/next
 *
 * Next.js integration entry point.
 *
 * Usage:
 *   import { withTailwindStyled } from "tailwind-styled-v4/next"
 */

export type { TailwindStyledNextOptions } from "./withTailwindStyled"
export { withTailwindStyled } from "./withTailwindStyled"

// Re-export schemas
export {
  NextAdapterOptionsSchema,
  parseNextAdapterOptions,
  type NextAdapterOptionsInput,
} from "./schemas"
