/**
 * tailwind-styled-v4/next
 *
 * Next.js integration entry point.
 *
 * Usage:
 *   import { withTailwindStyled } from "tailwind-styled-v4/next"
 */

// Re-export schemas
export {
  type NextAdapterOptionsInput,
  NextAdapterOptionsSchema,
  parseNextAdapterOptions,
} from "./schemas"
export type { TailwindStyledNextOptions } from "./withTailwindStyled"
export { withTailwindStyled } from "./withTailwindStyled"
