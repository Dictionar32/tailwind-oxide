#!/usr/bin/env node
/**
 * Smoke: root import tetap bekerja.
 * tailwind-styled-v4 root harus export tw dan createComponent.
 */
import { tw } from "tailwind-styled-v4"
import { createComponent } from "tailwind-styled-v4"

if (typeof tw !== "function") throw new Error("root import: tw is not a function")
if (typeof createComponent !== "function")
  throw new Error("root import: createComponent is not a function")
console.log("root import smoke OK")
