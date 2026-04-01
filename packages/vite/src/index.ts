export type { VitePluginOptions } from "./plugin"
export { default, tailwindStyledPlugin } from "./plugin"

// Re-export schemas
export {
  parseVitePluginOptions,
  type VitePluginOptionsInput,
  VitePluginOptionsSchema,
} from "./schemas"
