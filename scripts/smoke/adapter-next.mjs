#!/usr/bin/env node
/**
 * Smoke: Next.js adapter config helper exists.
 */
import { withTailwindStyled } from "@tailwind-styled/next"

if (typeof withTailwindStyled !== "function")
  throw new Error("next adapter: withTailwindStyled is not a function")
console.log("next adapter smoke OK")
