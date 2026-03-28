export type { VitePluginOptions } from "./plugin"
export { tailwindStyledPlugin } from "./plugin"
export { default } from "./plugin"

// Re-export schemas
export {
  VitePluginOptionsSchema,
  parseVitePluginOptions,
  type VitePluginOptionsInput,
} from "./schemas"
