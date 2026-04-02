//let
PS C:\Users\User\Documents\demoPackageNpm\focus\tailwind-styled-v4.5-platform-modify-v3_fixed (1)\library> cd packages
PS C:\Users\User\Documents\demoPackageNpm\focus\tailwind-styled-v4.5-platform-modify-v3_fixed (1)\library\packages> # Cari semua let (kecuali for loop dan loop counter)
>> grep -rn "let " packages/ --include="*.ts" | grep -v "for (let" | grep -v "let i = 0" | grep -v "let j = 0" | grep -v "let index"
>> 
>> # Atau lebih lengkap
>> grep -rn "let " packages/ --include="*.ts" | grep -v -E "for \(let|let [ij] = 0|let counter|let nextId|let \_"
>>
>> # Hitung jumlah let yang tersisa
>> grep -rn "let " packages/ --include="*.ts" | grep -v -E "for \(let|let [ij] = 0" | wc -l
/usr/bin/grep: packages/: No such file or directory
/usr/bin/grep: packages/: No such file or directory
/usr/bin/grep: packages/: No such file or directory
0
PS C:\Users\User\Documents\demoPackageNpm\focus\tailwind-styled-v4.5-platform-modify-v3_fixed (1)\library\packages> cd ..
PS C:\Users\User\Documents\demoPackageNpm\focus\tailwind-styled-v4.5-platform-modify-v3_fixed (1)\library> # Cari semua let (kecuali for loop dan loop counter)
>> grep -rn "let " packages/ --include="*.ts" | grep -v "for (let" | grep -v "let i = 0" | grep -v "let j = 0" | grep -v "let index"
>>
>> # Atau lebih lengkap
>> grep -rn "let " packages/ --include="*.ts" | grep -v -E "for \(let|let [ij] = 0|let counter|let nextId|let \_"
>>
>> # Hitung jumlah let yang tersisa
>> grep -rn "let " packages/ --include="*.ts" | grep -v -E "for \(let|let [ij] = 0" | wc -l
packages/cli/src/createApp.ts:394:  let count = 0
packages/compiler/src/componentHoister.ts:79:  // dan pindahkan ke top of file ??? using reduce to avoid let (Zero Let!)
packages/compiler/src/styleBucketSystem.ts:255:    // Use reduce instead of mutable let total
packages/engine/src/bundleAnalyzer.ts:253:    // Use for...of + matchAll instead of while loop with let match
packages/engine/src/cssToIr.ts:149:  // Use for...of + matchAll instead of while loop with let match
packages/engine/src/cssToIr.ts:166:  // Use for...of + matchAll instead of while loop with let match
packages/engine/src/reverseLookup.ts:51:      // Use for...of + matchAll instead of while loop with let match
packages/engine/src/reverseLookup.ts:79:          // Use for...of + matchAll instead of while loop with let propMatch
packages/svelte/dist/index.d.ts:25: *   export let intent = 'primary'
packages/svelte/dist/index.d.ts:26: *   export let size = 'sm'
packages/svelte/src/index.ts:25: *   export let intent = 'primary'
packages/svelte/src/index.ts:26: *   export let size = 'sm'











//any
PS C:\Users\User\Documents\demoPackageNpm\focus\tailwind-styled-v4.5-platform-modify-v3_fixed (1)\library> # Cari semua any
>> grep -rn " any" packages/ --include="*.ts" --include="*.tsx"
>> 
>> # Cari any dengan konteks
>> grep -rn " any" packages/ --include="*.ts" | grep -v "// .*any" | grep -v "as any"
>> 
>> # Hitung jumlah any
>> grep -rn " any" packages/ --include="*.ts" | wc -l
>>
>> # Cari as any (type assertion)
>> grep -rn "as any" packages/ --include="*.ts"
packages/analyzer/src/binding.ts:64:    debugLog("native binding not found in any candidate path")
packages/animate/src/binding.ts:61:    debugLog("native animate binding not found in any candidate path")
packages/cli/src/commands/setup/prompt.ts:57:    output: options.output as any,     
packages/cli/src/preflight.ts:13: *   tw preflight            -> show check results + exit 1 if any fail
packages/cli/src/utils/traceService.ts:65:function generateSelectorId(): any {
packages/cli/src/utils/traceService.ts:66:  return new (RuleId as any)(selectorIdCounter++)
packages/cli/src/utils/traceService.ts:71:  ;(id as any).name = propertyName        
packages/cli/src/utils/traceService.ts:77:  ;(id as any).name = valueName
packages/cli/src/utils/traceService.ts:267:      variantChain: { value: 0 } as any, 
packages/cli/src/utils/traceService.ts:297:  private propertyBuckets: Map<PropertyId, any> = new Map()
packages/cli/src/utils/traceService.ts:299:  private resolutions: Map<number, any> = new Map()
packages/cli/src/utils/traceService.ts:339:  resolveByClassName(className: string): { resolvedProperties: Map<PropertyId, any> } | null {
packages/cli/src/utils/traceService.ts:360:    const resolved = new Map<PropertyId, any>()
packages/cli/src/utils/traceService.ts:420:  const ruleTraces: any[] = []
packages/cli/src/utils/traceService.ts:421:  const conflictTraces: any[] = []       
packages/cli/src/utils/traceService.ts:568:// Helper function to safely convert any value to string
packages/cli/src/utils/traceService.ts:579:    const idValue = (value as any).value 
packages/cli/src/utils/traceService.ts:584:    const toString = (value as any).toString
packages/cli/src/utils/traceService.ts:599:// Helper function to safely convert any value to string
packages/cli/src/utils/traceService.ts:606:  // For any object - try various methods
packages/cli/src/utils/traceService.ts:609:    const name = (value as any).name     
packages/cli/src/utils/traceService.ts:615:    const objValue = (value as any).value
packages/cli/src/utils/traceService.ts:621:    const valueOf = (value as any).valueOf
packages/cli/src/utils/traceService.ts:630:    const toStr = (value as any).toString
packages/cli/src/utils/traceService.ts:655:    variants: engineResult.variants.map((v: any) => ({
packages/cli/src/utils/traceService.ts:663:    rules: engineResult.rules.map((r: any) => ({
packages/cli/src/utils/traceService.ts:674:    conflicts: engineResult.conflicts.map((c: any) => ({
packages/cli/src/utils/traceService.ts:681:    finalStyle: engineResult.finalStyle.map((f: any) => ({
packages/cli/src/utils/whyService.ts:55:        `The class may not generate any CSS rules.`
packages/compiler/src/astParser.ts:27:  compounds: Array<{ class: string; [key: string]: any }>
packages/compiler/src/astParser.ts:36:function oxcKey(node: any): string | null {   
packages/compiler/src/astParser.ts:44:function oxcStringVal(node: any): string | null {
packages/compiler/src/astParser.ts:48:    return (node.quasis as any[]).map((q: any) => q.value?.cooked ?? q.value?.raw ?? "").join("")
packages/compiler/src/astParser.ts:54:function oxcWalkObject(node: any): Record<string, any> {
packages/compiler/src/astParser.ts:55:  const result: Record<string, any> = {}      
packages/compiler/src/astParser.ts:71:      result[key] = (val.elements as any[])   
packages/compiler/src/astParser.ts:72:        .filter((el: any) => el?.type === "ObjectExpression")
packages/compiler/src/astParser.ts:73:        .map((el: any) => oxcWalkObject(el))  
packages/compiler/src/astParser.ts:86:  let parseSync: (filename: string, source: string, options?: any) => any
packages/compiler/src/astParser.ts:119:          for (const [vVal, cls] of Object.entries(vMap as Record<string, any>)) {
packages/compiler/src/astParser.ts:127:    const compounds: Array<{ class: string; [key: string]: any }> = []
packages/compiler/src/astParser.ts:296:      obj[key] = arr as any
packages/compiler/src/astParser.ts:355:  const compounds: Array<{ class: string; [key: string]: any }> = []
packages/compiler/src/astParser.ts:359:      if (item && typeof item.class === "string") compounds.push(item as any)
packages/compiler/src/astTransform.ts:26:  compoundVariants: Array<{ class: string; [key: string]: any }>
packages/compiler/src/astTransform.ts:555:): value is Array<{ class: string; [key: string]: any }> {
packages/compiler/src/internal.ts:5: * These functions may change at any time without notice.
packages/compiler/src/loadTailwindConfig.ts:17:export type TailwindConfig = Record<string, any>
packages/compiler/src/loadTailwindConfig.ts:79:    return config.content.files.filter((f: any) => typeof f === "string")
packages/compiler/src/staticVariantCompiler.ts:48:  compoundVariants?: Array<{ class: string; [key: string]: any }>
packages/compiler/src/staticVariantCompiler.ts:103:  compounds: Array<{ class: string; [key: string]: any }>,
packages/compiler/src/staticVariantCompiler.ts:222:  resolve(props: Record<string, any>): string {
packages/compiler/src/tailwindEngine.ts:29:  config?: Record<string, any>
packages/compiler/src/tailwindEngine.ts:52:  config?: Record<string, any>,
packages/compiler/src/tailwindEngine.ts:87:  _config: Record<string, any>,
packages/compiler/src/tailwindEngine.ts:121:  config: Record<string, any>
packages/compiler/src/variantCompiler.ts:30:  compounds: Array<{ class: string; [key: string]: any }>
packages/compiler/src/variantCompiler.ts:44:  compounds: Array<{ class: string; [key: string]: any }> = [],
packages/compiler/src/variantCompiler.ts:83:  compounds: Array<{ class: string; [key: string]: any }>
packages/core/src/containerQuery.ts:59:  ;(window as any).__TW_CONTAINER_REGISTRY__ = containerRegistry
packages/core/src/createComponent.ts:26:  return function filterProps(props: Record<string, any>): Record<string, any> {
packages/core/src/createComponent.ts:27:    const out: Record<string, any> = {}     
packages/core/src/createComponent.ts:44:  props: Record<string, any>,
packages/core/src/createComponent.ts:74:export function createComponent<P extends object = Record<string, any>>(
packages/core/src/createComponent.ts:75:  tag: any,
packages/core/src/createComponent.ts:109:    const Component = React.forwardRef<any, any>((props, ref) => {
packages/core/src/createComponent.ts:124:  const Component = React.forwardRef<any, any>((props, ref) => {
packages/core/src/createComponent.ts:146:  Component: any,
packages/core/src/createComponent.ts:147:  originalTag: any,
packages/core/src/createComponent.ts:151:  Component.extend = (strings: TemplateStringsArray, ..._exprs: any[]) => {
packages/core/src/createComponent.ts:179:  Component.animate = async (opts: any) => {
packages/core/src/liveTokenEngine.ts:73:  ;(window as any).__TW_TOKEN_ENGINE__ = {  
packages/core/src/liveTokenEngine.ts:262:  let useState: any, useEffect: any        
packages/core/src/stateEngine.ts:35:  ;(window as any).__TW_STATE_REGISTRY__ = stateRegistry
packages/core/src/styledSystem.ts:225:    const tag = (compCfg as any).tag ?? "div" 
packages/core/src/twProxy.ts:182:function makeServerTag(tag: any): TwTagFactory<any> {
packages/core/src/twProxy.ts:185:    return ((...args: any[]): TwStyledComponent<any> => {
packages/core/src/twProxy.ts:191:      return (baseFactory as any)(...args)
packages/core/src/twProxy.ts:216:  return makeTag(component) as any
packages/core/src/twProxy.ts:220:export const tw: TwObject = Object.assign(twCallable as any, tagFactories, {
packages/core/src/twTheme.ts:140:  const resolved = {} as any
packages/devtools/src/index.tsx:83:  const registry = (window as any).__TW_REGISTRY__ as Record<string, string> | undefined
packages/devtools/src/index.tsx:103:  const registry = (window as any).__TW_STATE_REGISTRY__ as Map<string, any> | undefined
packages/devtools/src/index.tsx:112:  const registry = (window as any).__TW_CONTAINER_REGISTRY__ as Map<string, any> | undefined
packages/devtools/src/index.tsx:116:      return entry.breakpoints.map((bp: any) => bp.minWidth)
packages/devtools/src/index.tsx:276:      const reg = (window as any).__TW_STATE_REGISTRY__ as Map<string, any> | undefined
packages/devtools/src/index.tsx:359:      const reg = (window as any).__TW_CONTAINER_REGISTRY__ as Map<string, any> | undefined
packages/devtools/src/index.tsx:411:          entry.breakpoints.map((bp: any, i: number) =>
packages/devtools/src/index.tsx:441:    const engine = (window as any).__TW_TOKEN_ENGINE__
packages/devtools/src/index.tsx:506:                const engine = (window as any).__TW_TOKEN_ENGINE__
packages/devtools/src/index.tsx:524:                const engine = (window as any).__TW_TOKEN_ENGINE__
packages/devtools/src/index.tsx:608:      const stateReg = (window as any).__TW_STATE_REGISTRY__ as Map<string, any> | undefined
packages/devtools/src/index.tsx:609:      const containerReg = (window as any).__TW_CONTAINER_REGISTRY__ as Map<string, any> | undefined
packages/devtools/src/index.tsx:610:      const tokenEngine = (window as any).__TW_TOKEN_ENGINE__
packages/engine/src/cssToIr.ts:268:      variantChain: { value: 0 } as any,
packages/engine/src/impactTracker.ts:56:    scanResult: any
packages/engine/src/impactTracker.ts:93:  findAffectedComponents(className: string, scanResult: any): ComponentImpact[] {
packages/engine/src/internal.ts:5: * These functions may change at any time without notice.
packages/engine/src/ir.ts:20:    const name = (this as any).name
packages/engine/src/ir.ts:32:    const name = (this as any).name
packages/engine/src/native-bridge.ts:78:    "The binding was not found in any of these paths:",
packages/engine/tsup.config.ts:21:  setup(build: any) {
packages/next/src/withTailwindStyled.ts:95:      (nextConfig as any).reactCompiler === true ||
packages/next/src/withTailwindStyled.ts:96:      (nextConfig as any).experimental?.reactCompiler === true
packages/next/src/withTailwindStyled.ts:187:              } = Array.isArray(existing) ? { beforeFiles: existing as any[] } : (existing as any)
packages/next/src/withTailwindStyled.ts:194:        ...(nextConfig.experimental as any),
packages/next/src/withTailwindStyled.ts:199:        ...(nextConfig as any).turbopack,
packages/next/src/withTailwindStyled.ts:217:          ...(nextConfig as any).turbopack?.rules,
packages/next/src/withTailwindStyled.ts:221:      webpack(webpackConfig: any, webpackOpts: any) {
packages/next/src/withTailwindStyled.ts:223:          (r: any) => r._tailwindStyledMarker === true
packages/plugin/src/index.ts:36:  compoundVariants: Array<{ class: string; [key: string]: any }>
packages/plugin/src/index.ts:59:  readonly config: Record<string, any>
packages/plugin/src/index.ts:82:function resolveTokenEngine(): any {
packages/plugin/src/index.ts:84:    return (globalThis as any)[TOKEN_ENGINE_KEY]    
packages/plugin/src/index.ts:89:function readToken(engine: any, name: string): string | undefined {
packages/plugin/src/index.ts:145:  transforms: Array<(config: any, ctx: any) => any>
packages/plugin/src/index.ts:158:export function registerTransform(transform: (config: any, ctx: any) => any): void {
packages/plugin/src/index.ts:186:function createContext(registry: PluginRegistry, config: Record<string, any> = {}): TwContext {
packages/plugin/src/index.ts:222:export function createTw(config: Record<string, any> = {}): TwContext & {
packages/plugin-registry/src/cli.ts:145:    if ((plugin as any).docs) console.log(`  docs: ${(plugin as any).docs}`)
packages/plugin-registry/src/cli.ts:146:    if ((plugin as any).install) console.log(`  install: ${(plugin as any).install}`)
packages/plugin-registry/src/index.ts:283:    } catch (e: any) {
packages/plugin-registry/src/index.ts:310:    } catch (e: any) {
packages/rspack/src/index.ts:51:  apply(compiler: any): void {
packages/rspack/src/index.ts:67:    const alreadyRegistered = existing.some((r: any) => r._tailwindStyledRspackMarker === true)
packages/scanner/src/native-bridge.ts:125:    "The binding was not found in any of these paths:",
packages/shared/dist/index.d.ts:72:declare function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T;
packages/shared/dist/index.d.ts:74:declare function throttle<T extends (...args: any[]) => void>(fn: T, ms: number): T;
packages/shared/src/nativeBinding.ts:191:    "The binding was not found in any of these paths:",
packages/shared/src/timing.ts:2:export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
packages/shared/src/timing.ts:4:  return ((...args: any[]) => {
packages/shared/src/timing.ts:14:export function throttle<T extends (...args: any[]) => void>(fn: T, ms: number): T {
packages/shared/src/timing.ts:16:  return ((...args: any[]) => {
packages/storybook-addon/src/index.ts:34:  compoundVariants?: Array<{ class: string; [key: string]: any }>
packages/svelte/src/index.ts:43:  compoundVariants?: Array<{ class: string; [key: string]: any }>
packages/svelte/src/index.ts:53:  props: Record<string, any>,
packages/svelte/src/index.ts:67:  compounds: Array<{ class: string; [key: string]: any }>,
packages/svelte/src/index.ts:68:  props: Record<string, any>
packages/svelte/src/index.ts:98:  return (props: Record<string, any> = {}) => {     
packages/svelte/src/index.ts:145:  { config, props = {} }: { config: SvelteComponentConfig; props?: Record<string, any> }
packages/svelte/src/index.ts:154:    props?: Record<string, any>
packages/svelte/src/index.ts:189:export function createVariants(config: SvelteComponentConfig, getProps: () => Record<string, any>) {
packages/theme/src/index.ts:122:    ;(vars as any)[group] = {}
packages/theme/src/index.ts:124:      ;(vars as any)[group][token] = `var(--${group}-${token})`
packages/theme/src/liveTokenEngine.ts:179:  ;(window as any).__TW_TOKEN_ENGINE__ = liveTokenEngine
packages/vite/src/plugin.ts:66:export function tailwindStyledPlugin(opts: VitePluginOptions = {}): any {
packages/vite/src/plugin.ts:94:    configResolved(config: any) {
packages/vite/src/plugin.ts:182:    handleHotUpdate({ file, server }: any) {        
packages/vite/src/vite.test.ts:5:  runLoaderTransform: vi.fn((opts: any) => ({      
packages/vscode/src/commands/whyCommand.ts:76:    <div>Not used in any files</div>  
packages/vue/src/index.ts:36:  compoundVariants?: Array<{ class: string; [key: string]: any }>
packages/vue/src/index.ts:93:  props: Record<string, any>,
packages/vue/src/index.ts:107:  compounds: Array<{ class: string; [key: string]: any }>,
packages/vue/src/index.ts:108:  props: Record<string, any>
packages/vue/src/index.ts:163:        const filteredAttrs: Record<string, any> = {} 
packages/vue/src/index.ts:194:  return (props: Record<string, any> = {}) => {       
packages/vue/src/index.ts:215:    name: `Extended${(component as any).name ?? "Component"}`,
packages/vue/src/index.ts:248:  install(app: any) {
packages/analyzer/src/binding.ts:64:    debugLog("native binding not found in any candidate path")
packages/animate/src/binding.ts:61:    debugLog("native animate binding not found in any candidate path")
packages/cli/src/preflight.ts:13: *   tw preflight            -> show check results + exit 1 if any fail
packages/cli/src/utils/traceService.ts:65:function generateSelectorId(): any {      
packages/cli/src/utils/traceService.ts:297:  private propertyBuckets: Map<PropertyId, any> = new Map()
packages/cli/src/utils/traceService.ts:299:  private resolutions: Map<number, any> = new Map()
packages/cli/src/utils/traceService.ts:339:  resolveByClassName(className: string): { resolvedProperties: Map<PropertyId, any> } | null {
packages/cli/src/utils/traceService.ts:360:    const resolved = new Map<PropertyId, any>()
packages/cli/src/utils/traceService.ts:420:  const ruleTraces: any[] = []
packages/cli/src/utils/traceService.ts:421:  const conflictTraces: any[] = []       
packages/cli/src/utils/traceService.ts:655:    variants: engineResult.variants.map((v: any) => ({
packages/cli/src/utils/traceService.ts:663:    rules: engineResult.rules.map((r: any) => ({
packages/cli/src/utils/traceService.ts:674:    conflicts: engineResult.conflicts.map((c: any) => ({
packages/cli/src/utils/traceService.ts:681:    finalStyle: engineResult.finalStyle.map((f: any) => ({
packages/cli/src/utils/whyService.ts:55:        `The class may not generate any CSS rules.`
packages/compiler/src/astParser.ts:27:  compounds: Array<{ class: string; [key: string]: any }>
packages/compiler/src/astParser.ts:36:function oxcKey(node: any): string | null {   
packages/compiler/src/astParser.ts:44:function oxcStringVal(node: any): string | null {
packages/compiler/src/astParser.ts:54:function oxcWalkObject(node: any): Record<string, any> {
packages/compiler/src/astParser.ts:55:  const result: Record<string, any> = {}      
packages/compiler/src/astParser.ts:72:        .filter((el: any) => el?.type === "ObjectExpression")
packages/compiler/src/astParser.ts:73:        .map((el: any) => oxcWalkObject(el))  
packages/compiler/src/astParser.ts:86:  let parseSync: (filename: string, source: string, options?: any) => any
packages/compiler/src/astParser.ts:119:          for (const [vVal, cls] of Object.entries(vMap as Record<string, any>)) {
packages/compiler/src/astParser.ts:127:    const compounds: Array<{ class: string; [key: string]: any }> = []
packages/compiler/src/astParser.ts:355:  const compounds: Array<{ class: string; [key: string]: any }> = []
packages/compiler/src/astTransform.ts:26:  compoundVariants: Array<{ class: string; [key: string]: any }>
packages/compiler/src/astTransform.ts:555:): value is Array<{ class: string; [key: string]: any }> {
packages/compiler/src/internal.ts:5: * These functions may change at any time without notice.
packages/compiler/src/loadTailwindConfig.ts:17:export type TailwindConfig = Record<string, any>
packages/compiler/src/loadTailwindConfig.ts:79:    return config.content.files.filter((f: any) => typeof f === "string")
packages/compiler/src/staticVariantCompiler.ts:48:  compoundVariants?: Array<{ class: string; [key: string]: any }>
packages/compiler/src/staticVariantCompiler.ts:103:  compounds: Array<{ class: string; [key: string]: any }>,
packages/compiler/src/staticVariantCompiler.ts:222:  resolve(props: Record<string, any>): string {
packages/compiler/src/tailwindEngine.ts:29:  config?: Record<string, any>
packages/compiler/src/tailwindEngine.ts:52:  config?: Record<string, any>,
packages/compiler/src/tailwindEngine.ts:87:  _config: Record<string, any>,
packages/compiler/src/tailwindEngine.ts:121:  config: Record<string, any>
packages/compiler/src/variantCompiler.ts:30:  compounds: Array<{ class: string; [key: string]: any }>
packages/compiler/src/variantCompiler.ts:44:  compounds: Array<{ class: string; [key: string]: any }> = [],
packages/compiler/src/variantCompiler.ts:83:  compounds: Array<{ class: string; [key: string]: any }>
packages/core/src/createComponent.ts:26:  return function filterProps(props: Record<string, any>): Record<string, any> {
packages/core/src/createComponent.ts:27:    const out: Record<string, any> = {}     
packages/core/src/createComponent.ts:44:  props: Record<string, any>,
packages/core/src/createComponent.ts:74:export function createComponent<P extends object = Record<string, any>>(
packages/core/src/createComponent.ts:75:  tag: any,
packages/core/src/createComponent.ts:109:    const Component = React.forwardRef<any, any>((props, ref) => {
packages/core/src/createComponent.ts:124:  const Component = React.forwardRef<any, any>((props, ref) => {
packages/core/src/createComponent.ts:146:  Component: any,
packages/core/src/createComponent.ts:147:  originalTag: any,
packages/core/src/createComponent.ts:151:  Component.extend = (strings: TemplateStringsArray, ..._exprs: any[]) => {
packages/core/src/createComponent.ts:179:  Component.animate = async (opts: any) => {
packages/core/src/liveTokenEngine.ts:262:  let useState: any, useEffect: any        
packages/core/src/twProxy.ts:182:function makeServerTag(tag: any): TwTagFactory<any> {
packages/core/src/twProxy.ts:185:    return ((...args: any[]): TwStyledComponent<any> => {
packages/engine/src/impactTracker.ts:56:    scanResult: any
packages/engine/src/impactTracker.ts:93:  findAffectedComponents(className: string, scanResult: any): ComponentImpact[] {
packages/engine/src/internal.ts:5: * These functions may change at any time without notice.
packages/engine/src/native-bridge.ts:78:    "The binding was not found in any of these paths:",
packages/engine/tsup.config.ts:21:  setup(build: any) {
packages/next/src/withTailwindStyled.ts:221:      webpack(webpackConfig: any, webpackOpts: any) {
packages/next/src/withTailwindStyled.ts:223:          (r: any) => r._tailwindStyledMarker === true
packages/plugin/src/index.ts:36:  compoundVariants: Array<{ class: string; [key: string]: any }>
packages/plugin/src/index.ts:59:  readonly config: Record<string, any>
packages/plugin/src/index.ts:82:function resolveTokenEngine(): any {
packages/plugin/src/index.ts:89:function readToken(engine: any, name: string): string | undefined {
packages/plugin/src/index.ts:145:  transforms: Array<(config: any, ctx: any) => any>
packages/plugin/src/index.ts:158:export function registerTransform(transform: (config: any, ctx: any) => any): void {
packages/plugin/src/index.ts:186:function createContext(registry: PluginRegistry, config: Record<string, any> = {}): TwContext {
packages/plugin/src/index.ts:222:export function createTw(config: Record<string, any> = {}): TwContext & {
packages/plugin-registry/src/index.ts:283:    } catch (e: any) {
packages/plugin-registry/src/index.ts:310:    } catch (e: any) {
packages/rspack/src/index.ts:51:  apply(compiler: any): void {
packages/rspack/src/index.ts:67:    const alreadyRegistered = existing.some((r: any) => r._tailwindStyledRspackMarker === true)
packages/scanner/src/native-bridge.ts:125:    "The binding was not found in any of these paths:",
packages/shared/dist/index.d.ts:72:declare function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T;
packages/shared/dist/index.d.ts:74:declare function throttle<T extends (...args: any[]) => void>(fn: T, ms: number): T;
packages/shared/src/nativeBinding.ts:191:    "The binding was not found in any of these paths:",
packages/shared/src/timing.ts:2:export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
packages/shared/src/timing.ts:4:  return ((...args: any[]) => {
packages/shared/src/timing.ts:14:export function throttle<T extends (...args: any[]) => void>(fn: T, ms: number): T {
packages/shared/src/timing.ts:16:  return ((...args: any[]) => {
packages/storybook-addon/src/index.ts:34:  compoundVariants?: Array<{ class: string; [key: string]: any }>
packages/svelte/src/index.ts:43:  compoundVariants?: Array<{ class: string; [key: string]: any }>
packages/svelte/src/index.ts:53:  props: Record<string, any>,
packages/svelte/src/index.ts:67:  compounds: Array<{ class: string; [key: string]: any }>,
packages/svelte/src/index.ts:68:  props: Record<string, any>
packages/svelte/src/index.ts:98:  return (props: Record<string, any> = {}) => {     
packages/svelte/src/index.ts:145:  { config, props = {} }: { config: SvelteComponentConfig; props?: Record<string, any> }
packages/svelte/src/index.ts:154:    props?: Record<string, any>
packages/svelte/src/index.ts:189:export function createVariants(config: SvelteComponentConfig, getProps: () => Record<string, any>) {
packages/vite/src/plugin.ts:66:export function tailwindStyledPlugin(opts: VitePluginOptions = {}): any {
packages/vite/src/plugin.ts:94:    configResolved(config: any) {
packages/vite/src/plugin.ts:182:    handleHotUpdate({ file, server }: any) {        
packages/vite/src/vite.test.ts:5:  runLoaderTransform: vi.fn((opts: any) => ({      
packages/vscode/src/commands/whyCommand.ts:76:    <div>Not used in any files</div>  
packages/vue/src/index.ts:36:  compoundVariants?: Array<{ class: string; [key: string]: any }>
packages/vue/src/index.ts:93:  props: Record<string, any>,
packages/vue/src/index.ts:107:  compounds: Array<{ class: string; [key: string]: any }>,
packages/vue/src/index.ts:108:  props: Record<string, any>
packages/vue/src/index.ts:163:        const filteredAttrs: Record<string, any> = {} 
packages/vue/src/index.ts:194:  return (props: Record<string, any> = {}) => {       
packages/vue/src/index.ts:248:  install(app: any) {
145
packages/cli/src/commands/setup/prompt.ts:57:    output: options.output as any,
packages/cli/src/utils/traceService.ts:66:  return new (RuleId as any)(selectorIdCounter++)
packages/cli/src/utils/traceService.ts:71:  ;(id as any).name = propertyName
packages/cli/src/utils/traceService.ts:77:  ;(id as any).name = valueName
packages/cli/src/utils/traceService.ts:267:      variantChain: { value: 0 } as any, 
packages/cli/src/utils/traceService.ts:579:    const idValue = (value as any).value 
packages/cli/src/utils/traceService.ts:584:    const toString = (value as any).toString
packages/cli/src/utils/traceService.ts:609:    const name = (value as any).name     
packages/cli/src/utils/traceService.ts:615:    const objValue = (value as any).value
packages/cli/src/utils/traceService.ts:621:    const valueOf = (value as any).valueOf
packages/cli/src/utils/traceService.ts:630:    const toStr = (value as any).toString
packages/compiler/src/astParser.ts:48:    return (node.quasis as any[]).map((q: any) => q.value?.cooked ?? q.value?.raw ?? "").join("")
packages/compiler/src/astParser.ts:71:      result[key] = (val.elements as any[])   
packages/compiler/src/astParser.ts:296:      obj[key] = arr as any
packages/compiler/src/astParser.ts:359:      if (item && typeof item.class === "string") compounds.push(item as any)
packages/core/src/containerQuery.ts:59:  ;(window as any).__TW_CONTAINER_REGISTRY__ = containerRegistry
packages/core/src/liveTokenEngine.ts:73:  ;(window as any).__TW_TOKEN_ENGINE__ = {  
packages/core/src/stateEngine.ts:35:  ;(window as any).__TW_STATE_REGISTRY__ = stateRegistry
packages/core/src/styledSystem.ts:225:    const tag = (compCfg as any).tag ?? "div"
packages/core/src/twProxy.ts:191:      return (baseFactory as any)(...args)
packages/core/src/twProxy.ts:216:  return makeTag(component) as any
packages/core/src/twProxy.ts:220:export const tw: TwObject = Object.assign(twCallable as any, tagFactories, {
packages/core/src/twTheme.ts:140:  const resolved = {} as any
packages/engine/src/cssToIr.ts:268:      variantChain: { value: 0 } as any,
packages/engine/src/ir.ts:20:    const name = (this as any).name
packages/engine/src/ir.ts:32:    const name = (this as any).name
packages/next/src/withTailwindStyled.ts:95:      (nextConfig as any).reactCompiler === true ||
packages/next/src/withTailwindStyled.ts:96:      (nextConfig as any).experimental?.reactCompiler === true
packages/next/src/withTailwindStyled.ts:187:              } = Array.isArray(existing) ? { beforeFiles: existing as any[] } : (existing as any)
packages/next/src/withTailwindStyled.ts:194:        ...(nextConfig.experimental as any),
packages/next/src/withTailwindStyled.ts:199:        ...(nextConfig as any).turbopack,
packages/next/src/withTailwindStyled.ts:217:          ...(nextConfig as any).turbopack?.rules,
packages/plugin/src/index.ts:84:    return (globalThis as any)[TOKEN_ENGINE_KEY]
packages/plugin-registry/src/cli.ts:145:    if ((plugin as any).docs) console.log(`  docs: ${(plugin as any).docs}`)
packages/plugin-registry/src/cli.ts:146:    if ((plugin as any).install) console.log(`  install: ${(plugin as any).install}`)
packages/theme/src/index.ts:122:    ;(vars as any)[group] = {}
packages/theme/src/index.ts:124:      ;(vars as any)[group][token] = `var(--${group}-${token})`
packages/theme/src/liveTokenEngine.ts:179:  ;(window as any).__TW_TOKEN_ENGINE__ = liveTokenEngine
packages/vue/src/index.ts:215:    name: `Extended${(component as any).name ?? "Component"}`,
PS C:\Users\User\Documents\demoPackageNpm\focus\tailwind-styled-v4.5-platform-modify-v3_fixed (1)\library>







      







//try-catch
PS C:\Users\User\Documents\demoPackageNpm\focus\tailwind-styled-v4.5-platform-modify-v3_fixed (1)\library>                       
>> # Hitung jumlah try-catch                       
>> grep -rn "try {" packages/ --include="*.ts" | wc -l
>> 
>> # Cari catch (untuk error handling)
>> grep -rn "catch" packages/ --include="*.ts"
174
packages/analyzer/src/analyzeWorkspace.ts:105:  } catch (error) {
packages/analyzer/src/analyzeWorkspace.ts:126:  } catch (error) {
packages/analyzer/src/analyzeWorkspace.ts:144:    } catch (error) {
packages/analyzer/src/classToCss.ts:109:    } catch (error) {
packages/analyzer/src/semantic.ts:320:  const configStat = await fs.promises.stat(configPath).catch(() => null)
packages/analyzer/src/semantic.ts:350:  } catch (error) {
packages/analyzer/src/semantic.ts:365:    } catch (error) {
packages/analyzer/src/utils.ts:22:  } catch {
packages/animate/src/preset.ts:24:      } catch (error) {
packages/animate/src/registry.ts:104:    } catch (error) {
packages/cli/src/commands/deploy.ts:54:          } catch {
packages/cli/src/commands/deploy.ts:195:    } catch (error) {
packages/cli/src/commands/doctor.ts:15:    const issues: DiagnosticResult = await executeDiagnostics(context, { verbose }).catch(() => runBasicDiagnostics())
packages/cli/src/commands/doctor.ts:23:  } catch (error) {
packages/cli/src/commands/doctor.ts:79:  } catch {
packages/cli/src/commands/doctor.ts:104:  } catch {
packages/cli/src/commands/doctor.ts:133:    } catch {
packages/cli/src/commands/doctor.ts:188:  } catch {
packages/cli/src/commands/misc.ts:213:  } catch (error) {
packages/cli/src/commands/setup/patchers.ts:167:  } catch {
packages/cli/src/commands/setup/workspace.ts:163:  } catch {
packages/cli/src/commands/storybook.ts:38:      } catch (error) {
packages/cli/src/commands/trace.ts:27:  } catch (error) {
packages/cli/src/commands/why.ts:70:  } catch (error) {
packages/cli/src/preflight.ts:242:        } catch {
packages/cli/src/preflight.ts:295:  runPreflightCli(process.argv.slice(2)).catch((error) => {
packages/cli/src/utils/analyzer.ts:26:  } catch (error) {
packages/cli/src/utils/doctorService.ts:57:  } catch (error) {
packages/cli/src/utils/fs.ts:8:  } catch {
packages/cli/src/utils/fs.ts:16:  } catch {
packages/cli/src/utils/fs.ts:26:  } catch {
packages/cli/src/utils/process.ts:117:  } catch {
packages/cli/src/utils/runtime.ts:120:  } catch (error) {
packages/cli/src/utils/traceService.ts:540:  } catch (error) {
packages/cli/src/utils/traceService.ts:592:    } catch {
packages/cli/src/utils/traceService.ts:626:      } catch {}
packages/cli/src/utils/traceService.ts:637:      } catch {}
packages/cli/src/utils/whyService.ts:46:  } catch (error) {
packages/compiler/src/astParser.ts:91:  } catch {
packages/compiler/src/astParser.ts:147:  } catch {
packages/compiler/src/astTransform.ts:415:          } catch (error) {
packages/compiler/src/coreCompiler.ts:150:      } catch {}
packages/compiler/src/cssCompiler.ts:82:    } catch {
packages/compiler/src/deadStyleEliminator.ts:158:      } catch {
packages/compiler/src/incrementalEngine.ts:100:  } catch {
packages/compiler/src/incrementalEngine.ts:111:  } catch {
packages/compiler/src/incrementalEngine.ts:123:  } catch {
packages/compiler/src/incrementalEngine.ts:134:  } catch {
packages/compiler/src/incrementalEngine.ts:320:    } catch {
packages/compiler/src/incrementalEngine.ts:347:    } catch {
packages/compiler/src/incrementalEngine.ts:360:    } catch {
packages/compiler/src/loaderCore.ts:75:  } catch (err) {
packages/compiler/src/loaderCore.ts:106:    } catch {
packages/compiler/src/loadTailwindConfig.ts:51:      } catch {}
packages/compiler/src/nativeBridge.ts:125:  } catch (error) {
packages/compiler/src/nativeBridge.ts:221:    } catch {
packages/compiler/src/nativeBridge.ts:231:    } catch {
packages/compiler/src/rustCssCompiler.ts:87:    } catch {
packages/compiler/src/safelistGenerator.ts:48:      } catch {
packages/compiler/src/safelistGenerator.ts:67:  } catch {
packages/compiler/src/safelistGenerator.ts:92:      } catch {
packages/compiler/src/tailwindEngine.ts:65:  } catch {
packages/compiler/src/tailwindEngine.ts:74:  } catch {
packages/compiler/src/tailwindEngine.ts:240:    } catch (e) {
packages/core/src/containerQuery.ts:195:  } catch {
packages/core/src/createComponent.ts:189:    } catch {
packages/core/src/liveTokenEngine.ts:122:    } catch {
packages/core/src/liveTokenEngine.ts:267:  } catch {
packages/core/src/parser.ts:16:    } catch {
packages/core/src/parser.ts:88:    } catch {
packages/core/src/parser.ts:193:    } catch {
packages/core/src/parser.ts:224:    } catch {
packages/core/src/parser.ts:249:    } catch {
packages/core/src/stateEngine.ts:198:  } catch {
packages/engine/src/bundleAnalyzer.ts:97:      } catch (error) {
packages/engine/src/incremental.ts:98:    } catch (error) {
packages/engine/src/index.ts:117:  } catch (e) {
packages/engine/src/index.ts:184:    } catch (pluginError) {
packages/engine/src/index.ts:200:    } catch (error) {
packages/engine/src/index.ts:211:      } catch (error) {
packages/engine/src/index.ts:233:      } catch (error) {
packages/engine/src/index.ts:262:        } catch {
packages/engine/src/index.ts:301:        } catch (error) {
packages/engine/src/index.ts:320:        } catch (error) {
packages/engine/src/metricsWriter.ts:53:  } catch {
packages/engine/src/native-bridge.ts:63:    } catch (error) {
packages/engine/src/trace.ts:105:    } catch {
packages/engine/src/watch-native.ts:46:    } catch {
packages/engine/src/watch-native.ts:85:    } catch (error) {
packages/engine/src/watch-native.ts:104:      } catch (error) {
packages/engine/src/watch.ts:58:    } catch {
packages/engine/src/watch.ts:82:    } catch {
packages/engine/src/watch.ts:101:        } catch {
packages/next/src/routeCssMiddleware.ts:49:      } catch {}
packages/next/src/webpackLoader.ts:57:  } catch (err) {
packages/next/src/withTailwindStyled.ts:131:      } catch {
packages/next/src/withTailwindStyled.ts:147:      } catch {
packages/next/src/withTailwindStyled.ts:160:      } catch (e) {
packages/next/src/withTailwindStyled.ts:264:        } catch (e) {
packages/next/src/withTailwindStyled.ts:274:          } catch (e) {
packages/next/src/withTailwindStyled.ts:325:          } catch (e) {
packages/next/src/withTailwindStyled.ts:350:          } catch (e) {
packages/plugin/src/plugins.ts:445:  } catch {
packages/plugin-registry/src/cli.ts:79:    } catch (error) {
packages/plugin-registry/src/cli.ts:175:    } catch (error) {
packages/plugin-registry/src/cli.ts:200:    } catch (error) {
packages/plugin-registry/src/cli.ts:244:run().catch((error) => {
packages/plugin-registry/src/index.ts:123:    } catch (error) {
packages/plugin-registry/src/index.ts:283:    } catch (e: any) {
packages/plugin-registry/src/index.ts:310:    } catch (e: any) {
packages/preset/src/defaultPreset.ts:467:  catch { return [] }
packages/rspack/src/loader.ts:50:  } catch (err) {
packages/scanner/src/ast-native.ts:56:    } catch {
packages/scanner/src/cache.ts:53:    } catch {
packages/scanner/src/in-memory-cache.ts:54:    } catch {
packages/scanner/src/index.minified.ts:53:    } catch (error) {
packages/scanner/src/index.minified.ts:74:  } catch (error) {
packages/scanner/src/index.minified.ts:122:    } catch {
packages/scanner/src/index.minified.ts:153:  } catch {
packages/scanner/src/index.minified.ts:330:  } catch {
packages/scanner/src/index.minified.ts:356:    } catch {
packages/scanner/src/index.ts:20:} catch (error) {
packages/scanner/src/index.ts:66:    } catch (error) {
packages/scanner/src/index.ts:91:  } catch (error) {
packages/scanner/src/index.ts:220:    } catch {
packages/scanner/src/index.ts:258:    } catch (error) {
packages/scanner/src/index.ts:321:    } catch (error) {
packages/scanner/src/index.ts:344:      } catch {
packages/scanner/src/index.ts:375:      } catch {
packages/scanner/src/index.ts:414:    } catch (error) {
packages/scanner/src/index.ts:446:  } catch (error) {
packages/scanner/src/native-bridge.ts:110:    } catch (error) {
packages/scanner/src/native-bridge.ts:177:  } catch {
packages/scanner/src/oxc-bridge.ts:56:    } catch {
packages/shared/src/hash.ts:18:  } catch {
packages/shared/src/nativeBinding.ts:155:    } catch (error) {
packages/testing/src/index.ts:322:    } catch (e: unknown) {
packages/theme/src/liveTokenEngine.ts:65:    } catch {
packages/theme/src/native-bridge.ts:39:    } catch {
packages/vite/src/plugin.ts:134:        } catch (e) {
packages/vite/src/plugin.ts:154:      } catch (e) {
packages/vite/src/plugin.ts:171:        } catch (e) {
packages/vscode/src/commands/doctorCommand.ts:84:    } catch (error) {
packages/vscode/src/commands/traceCommand.ts:102:    } catch (error) {
packages/vscode/src/commands/whyCommand.ts:100:    } catch (error) {
packages/vscode/src/providers/completionProvider.ts:134:        } catch (error) {   
packages/vscode/src/providers/hoverProvider.ts:46:        } catch (error) {
packages/vscode/src/providers/inlineDecorationProvider.ts:118:  } catch (error) {   
packages/vscode/src/providers/inlineDecorationProvider.ts:169:      } catch (error) {
packages/vscode/src/providers/inlineDecorationProvider.ts:198:      } catch (error) {
packages/vscode/src/services/engineService.ts:124:    } catch (error) {
packages/vscode/src/services/engineService.ts:182:    } catch (error) {
packages/vscode/src/services/engineService.ts:214:    } catch (error) {
packages/vscode/src/services/engineService.ts:263:    } catch (error) {
packages/vscode/src/services/engineService.ts:292:    } catch (error) {
packages/vscode/src/utils/exec-script.ts:79:    } catch {
PS C:\Users\User\Documents\demoPackageNpm\focus\tailwind-styled-v4.5-platform-modify-v3_fixed (1)\library>
































//class
PS C:\Users\User\Documents\demoPackageNpm\focus\tailwind-styled-v4.5-platform-modify-v3_fixed (1)\library> # Cari semua class
>> grep -rn "^export class\|^class" packages/ --include="*.ts"
>> 
>> # Cari class dengan constructor
>> grep -rn "constructor(" packages/ --include="*.ts"
>> 
>> # Hitung jumlah class
>> grep -rn "^export class\|^class" packages/ --include="*.ts" | wc -l
packages/animate/src/registry.ts:122:export class AnimationRegistry {
packages/cli/src/utils/errors.ts:1:export class CliError extends Error {
packages/cli/src/utils/errors.ts:20:export class CliUsageError extends CliError {
packages/cli/src/utils/traceService.ts:296:class CascadeResolver {
packages/compiler/src/context.ts:11:export class CompileContext {
packages/compiler/src/coreCompiler.ts:83:class CompilerCore {
packages/compiler/src/incrementalEngine.ts:221:class GlobalAtomicRegistry {
packages/compiler/src/incrementalEngine.ts:294:class CssDiffWriter {
packages/compiler/src/incrementalEngine.ts:383:export class IncrementalEngine {     
packages/compiler/src/pipeline.ts:3:export class Pipeline<T extends { done?: boolean }> {
packages/compiler/src/staticVariantCompiler.ts:213:export class StaticVariantResolver {
packages/compiler/src/styleBucketSystem.ts:265:export class BucketEngine {
packages/compiler/src/styleRegistry.ts:96:export class StyleRegistry {
packages/engine/src/bundleAnalyzer.ts:36:export class BundleAnalyzer {
packages/engine/src/impactTracker.ts:23:export class ImpactTracker {
packages/engine/src/ir.ts:1:export class RuleId {
packages/engine/src/ir.ts:6:export class SelectorId {
packages/engine/src/ir.ts:11:export class VariantChainId {
packages/engine/src/ir.ts:16:export class PropertyId {
packages/engine/src/ir.ts:28:export class ValueId {
packages/engine/src/ir.ts:40:export class LayerId {
packages/engine/src/ir.ts:45:export class ConditionId {
packages/engine/src/ir.ts:50:export class CascadeResolutionId {
packages/engine/src/metrics.ts:13:export class EngineMetricsCollector {
packages/engine/src/resolver.ts:146:export class CascadeResolver {
packages/engine/src/reverseLookup.ts:28:export class ReverseLookup {
packages/plugin-registry/src/index.ts:47:export class PluginRegistryError extends Error {
packages/plugin-registry/src/index.ts:78:export class PluginRegistry {
packages/rspack/src/index.ts:44:export class TailwindStyledRspackPlugin {
packages/scanner/src/cache.ts:28:export class ScanCache {
packages/shared/src/cache.ts:5:export class LRUCache<K, V> {
packages/theme/src/index.ts:185:export class ThemeRegistry {
packages/vscode/src/extension.ts:46:class HoverProvider implements vscode.HoverProvider {
packages/vscode/src/extension.ts:71:class CompletionProvider implements vscode.CompletionItemProvider {
packages/vscode/src/services/engineService.ts:87:export class EngineService {       
packages/animate/src/registry.ts:127:  constructor(options: AnimationRegistryOptions = {}) {
packages/cli/src/utils/errors.ts:5:  constructor(
packages/cli/src/utils/errors.ts:21:  constructor(message: string, options: { cause?: unknown } = {}) {
packages/compiler/src/context.ts:19:  constructor(input: CompileInput) {
packages/compiler/src/coreCompiler.ts:90:  constructor() {
packages/compiler/src/incrementalEngine.ts:299:  constructor(outputPath: string) {  
packages/compiler/src/incrementalEngine.ts:402:  constructor(opts: IncrementalEngineOptions = {}) {
packages/compiler/src/staticVariantCompiler.ts:217:  constructor(config: StaticVariantConfig) {
packages/compiler/src/styleBucketSystem.ts:268:  constructor() {
packages/engine/src/impactTracker.ts:49:  constructor() {
packages/engine/src/ir.ts:2:  constructor(public readonly value: number) {}
packages/engine/src/ir.ts:7:  constructor(public readonly value: number) {}
packages/engine/src/ir.ts:12:  constructor(public readonly value: number) {}        
packages/engine/src/ir.ts:17:  constructor(public readonly value: number) {}        
packages/engine/src/ir.ts:29:  constructor(public readonly value: number) {}        
packages/engine/src/ir.ts:41:  constructor(public readonly value: number) {}        
packages/engine/src/ir.ts:46:  constructor(public readonly value: number) {}        
packages/engine/src/ir.ts:51:  constructor(public readonly value: number) {}        
packages/plugin-registry/src/index.ts:51:  constructor(payload: PluginRegistryErrorPayload) {
packages/plugin-registry/src/index.ts:82:  constructor(registryData?: RegistryData, options: RegistryOptions = {}) {
packages/rspack/src/index.ts:47:  constructor(opts: RspackPluginOptions = {}) {     
packages/scanner/src/cache.ts:32:  constructor(rootDir: string, options: ScanCacheOptions = {}) {
packages/shared/dist/index.d.ts:9:    constructor(max?: number, ttlMs?: number | null);
packages/shared/src/cache.ts:10:  constructor(max = 256, ttlMs: number | null = null) {
packages/vscode/src/services/engineService.ts:92:  constructor(rootPath: string) {
35
PS C:\Users\User\Documents\demoPackageNpm\focus\tailwind-styled-v4.5-platform-modify-v3_fixed (1)\library>












//interface
PS C:\Users\User\Documents\demoPackageNpm\focus\tailwind-styled-v4.5-platform-modify-v3_fixed (1)\library> # Cari semua interface
>> grep -rn "^export interface\|^interface" packages/ --include="*.ts"
>> 
>> # Hitung jumlah interface
>> grep -rn "^export interface\|^interface" packages/ --include="*.ts" | wc -l
packages/analyzer/src/types.ts:3:export interface NativeAnalyzerBinding {
packages/analyzer/src/types.ts:8:export interface NativeCssCompilerBinding extends NativeAnalyzerBinding {
packages/analyzer/src/types.ts:12:export interface NativeReport {
packages/analyzer/src/types.ts:22:export interface NativeCssCompileResult {
packages/analyzer/src/types.ts:29:export interface ClassUsage {
packages/analyzer/src/types.ts:36:export interface ClassConflict {
packages/analyzer/src/types.ts:43:export interface AnalyzerSemanticReport {
packages/analyzer/src/types.ts:56:export interface AnalyzerReport {
packages/analyzer/src/types.ts:73:export interface AnalyzerOptions {
packages/analyzer/src/types.ts:87:export interface ClassToCssOptions {
packages/analyzer/src/types.ts:92:export interface ClassToCssResult {
packages/analyzer/src/types.ts:101:export interface LoadedTailwindConfig {
packages/analyzer/src/types.ts:109:export interface TailwindConfigCacheEntry {      
packages/animate/src/index.ts:73:export interface InjectAnimationCssOptions {       
packages/animate/src/types.ts:21:export interface AnimateOptions {
packages/animate/src/types.ts:33:export interface KeyframesDefinition {
packages/animate/src/types.ts:37:export interface CompiledAnimation {
packages/animate/src/types.ts:43:export interface AnimationRegistryOptions {        
packages/animate/src/types.ts:47:export interface NativeCompiledAnimation {
packages/animate/src/types.ts:53:export interface NativeAnimateBinding {
packages/atomic/src/index.ts:3:export interface AtomicRule {
packages/cli/src/analyze.ts:16:export interface ComponentDef {
packages/cli/src/commands/deploy.ts:10:interface DeployManifest {
packages/cli/src/commands/deploy.ts:21:interface DeployResponse {
packages/cli/src/commands/doctor.ts:28:interface DiagnosticIssue {
packages/cli/src/commands/doctor.ts:36:interface DiagnosticResult {
packages/cli/src/commands/help.ts:1:interface HelpEntry {
packages/cli/src/commands/misc.ts:125:interface VersionPayload {
packages/cli/src/commands/scriptCommands.ts:8:interface ScriptRunOptions {
packages/cli/src/commands/setup/prompt.ts:6:interface PromptOptions {
packages/cli/src/commands/setup/workspace.ts:10:export interface SetupFlags {       
packages/cli/src/commands/setup/workspace.ts:18:export interface SetupProjectOption {
packages/cli/src/commands/setup/workspace.ts:24:interface PackageJsonLike {
packages/cli/src/commands/trace.ts:36:interface TraceResult {
packages/cli/src/commands/types.ts:3:export interface CommandContext {
packages/cli/src/commands/types.ts:12:export interface CommandDefinition {
packages/cli/src/createApp.ts:17:interface CreateCliOptions {
packages/cli/src/createApp.ts:24:interface CreateContext {
packages/cli/src/createApp.ts:31:interface CreateReport {
packages/cli/src/extract.ts:12:interface ExtractCandidate {
packages/cli/src/init.ts:6:export interface InitReport {
packages/cli/src/migrate.ts:9:interface MigrateOptions {
packages/cli/src/migrate.ts:14:export interface MigrateReport {
packages/cli/src/migrateWizard.ts:5:export interface MigrateWizardOptions {
packages/cli/src/preflight.ts:26:interface PackageJsonLike {
packages/cli/src/preflight.ts:45:export interface PreflightReport {
packages/cli/src/scan.ts:6:export interface ScanCliResult {
packages/cli/src/setup.ts:46:interface SetupReport {
packages/cli/src/utils/analyzer.ts:5:export interface AnalyzerModule {
packages/cli/src/utils/args.ts:3:export interface ParsedCliInput {
packages/cli/src/utils/doctorService.ts:4:export interface DiagnosticIssue {        
packages/cli/src/utils/doctorService.ts:12:export interface DiagnosticResult {      
packages/cli/src/utils/doctorService.ts:22:export interface RunDiagnosticsOptions { 
packages/cli/src/utils/json.ts:1:export interface CliJsonSuccess<T = unknown> {     
packages/cli/src/utils/logger.ts:5:export interface CliLogger {
packages/cli/src/utils/logger.ts:15:export interface CliLogEvent {
packages/cli/src/utils/logger.ts:20:export interface CreateCliLoggerOptions {       
packages/cli/src/utils/output.ts:14:export interface CliOutputOptions {
packages/cli/src/utils/output.ts:22:export interface CliSpinner {
packages/cli/src/utils/output.ts:31:export interface CliOutput {
packages/cli/src/utils/process.ts:6:export interface RunCommandOptions {
packages/cli/src/utils/process.ts:14:export interface RunCommandCaptureOptions {    
packages/cli/src/utils/process.ts:21:export interface RunCommandCaptureResult {     
packages/cli/src/utils/process.ts:29:export interface ParsedCommandOutput {
packages/cli/src/utils/runtime.ts:9:interface CommanderLikeError extends Error {
packages/cli/src/utils/runtime.ts:14:export interface CliMainOptions {
packages/cli/src/utils/traceService.ts:17:interface EngineTraceResult {
packages/cli/src/utils/traceService.ts:39:interface ParsedSelector {
packages/cli/src/utils/traceService.ts:46:interface ParsedRule {
packages/cli/src/utils/traceService.ts:496:export interface TraceResult {
packages/cli/src/utils/traceService.ts:518:export interface TraceOptions {
packages/cli/src/utils/whyService.ts:5:export interface WhyResult {
packages/compiler/src/astParser.ts:24:export interface ParsedComponentConfig {      
packages/compiler/src/astParser.ts:167:interface Token {
packages/compiler/src/astParser.ts:258:interface ParsedObject {
packages/compiler/src/astTransform.ts:23:export interface ComponentConfig {
packages/compiler/src/astTransform.ts:41:export interface TransformOptions {        
packages/compiler/src/astTransform.ts:54:export interface TransformResult {
packages/compiler/src/astTransform.ts:164:interface SubComponentBlock {
packages/compiler/src/atomicCss.ts:28:export interface AtomicRule {
packages/compiler/src/componentGenerator.ts:13:export interface GenerateOptions {   
packages/compiler/src/componentHoister.ts:34:export interface HoistResult {
packages/compiler/src/context.ts:5:export interface CompileInput {
packages/compiler/src/coreCompiler.ts:8:export interface CoreCompileOptions extends TransformOptions {}
packages/compiler/src/coreCompiler.ts:10:export interface CoreCompileResult {       
packages/compiler/src/coreCompiler.ts:79:interface CompileContextExtended extends CompileContext {
packages/compiler/src/cssCompiler.ts:28:interface NativeCssBinding {
packages/compiler/src/cssCompiler.ts:101:export interface CssCompileResult {        
packages/compiler/src/deadStyleEliminator.ts:38:export interface VariantUsage {     
packages/compiler/src/deadStyleEliminator.ts:47:export interface EliminationReport {
packages/compiler/src/deadStyleEliminator.ts:171:export interface RegisteredComponent {
packages/compiler/src/deadStyleEliminator.ts:338:export interface EliminationOptions {
packages/compiler/src/incrementalEngine.ts:31:export interface StyleNode {
packages/compiler/src/incrementalEngine.ts:49:export interface CssDiff {
packages/compiler/src/incrementalEngine.ts:59:export interface ProcessResult {      
packages/compiler/src/incrementalEngine.ts:71:export interface IncrementalStats {   
packages/compiler/src/incrementalEngine.ts:215:interface GlobalEntry {
packages/compiler/src/incrementalEngine.ts:374:export interface IncrementalEngineOptions {
packages/compiler/src/loaderCore.ts:15:export interface LoaderOptions extends TransformOptions {
packages/compiler/src/loaderCore.ts:22:export interface LoaderContext {
packages/compiler/src/loaderCore.ts:29:export interface LoaderOutput {
packages/compiler/src/nativeBridge.ts:39:export interface NativeTransformResult {   
packages/compiler/src/nativeBridge.ts:50:export interface NativeRscResult {
packages/compiler/src/nativeBridge.ts:56:export interface ComponentMetadata {       
packages/compiler/src/nativeBridge.ts:64:export interface NativeBridge {
packages/compiler/src/routeCssCollector.ts:27:export interface RouteClassMap {      
packages/compiler/src/rscAnalyzer.ts:22:export interface RscAnalysis {
packages/compiler/src/rscAnalyzer.ts:147:export interface StaticVariantUsage {      
packages/compiler/src/rustCssCompiler.ts:22:interface NativeCompilerBinding {       
packages/compiler/src/rustCssCompiler.ts:106:export interface CssCompileResult {    
packages/compiler/src/rustCssCompiler.ts:114:export interface AstExtractResult {    
packages/compiler/src/staticVariantCompiler.ts:44:export interface StaticVariantConfig {
packages/compiler/src/staticVariantCompiler.ts:52:export interface CompiledVariantTable {
packages/compiler/src/styleBucketSystem.ts:252:export interface BucketStats {       
packages/compiler/src/styleBucketSystem.ts:437:export interface ConflictWarning {   
packages/compiler/src/styleRegistry.ts:27:export interface StyleEntry {
packages/compiler/src/styleRegistry.ts:42:export interface RegistryStats {
packages/compiler/src/tailwindEngine.ts:25:export interface TailwindEngineOptions { 
packages/compiler/src/tailwindEngine.ts:33:export interface CssGenerateResult {     
packages/compiler/src/variantCompiler.ts:27:export interface CompiledVariants {     
packages/core/src/containerQuery.ts:48:export interface ContainerEntry {
packages/core/src/containerQuery.ts:210:export interface ContainerQueryResult {     
packages/core/src/liveTokenEngine.ts:48:export interface LiveTokenSet {
packages/core/src/merge.ts:5:export interface MergeOptions {
packages/core/src/parser.ts:25:export interface ParsedClassModifier {
packages/core/src/parser.ts:30:export interface ParsedClass {
packages/core/src/parser.ts:39:interface NativeParserBinding {
packages/core/src/registry.ts:3:export interface SubComponentEntry {
packages/core/src/stateEngine.ts:25:export interface StateComponentEntry {
packages/core/src/stateEngine.ts:213:export interface StateEngineResult {
packages/core/src/styled.ts:3:export interface StyledOptions {
packages/core/src/styledSystem.ts:53:export interface SystemComponentConfig extends ComponentConfig {
packages/core/src/styledSystem.ts:58:export interface StyledSystemConfig<
packages/core/src/themeReader.ts:1:export interface ThemeConfig {
packages/core/src/twTheme.ts:91:export interface ThemeTokenMap {
packages/engine/src/bundleAnalyzer.ts:15:export interface ClassBundleInfo {
packages/engine/src/bundleAnalyzer.ts:26:export interface BundleAnalysisResult {    
packages/engine/src/cssToIr.ts:18:export interface ParseCssToIrOptions {
packages/engine/src/cssToIr.ts:22:interface ParsedSelector {
packages/engine/src/cssToIr.ts:29:interface ParsedRule {
packages/engine/src/impactTracker.ts:4:export interface ImpactReport {
packages/engine/src/impactTracker.ts:15:export interface ComponentImpact {
packages/engine/src/index.ts:33:export interface EngineOptions {
packages/engine/src/index.ts:43:export interface EngineWatchOptions {
packages/engine/src/index.ts:49:export interface BuildResult {
packages/engine/src/index.ts:77:export interface TailwindStyledEngine {
packages/engine/src/ir.ts:110:export interface ResolutionReason {
packages/engine/src/ir.ts:115:export interface SelectorIR {
packages/engine/src/ir.ts:122:export interface VariantChainIR {
packages/engine/src/ir.ts:128:export interface ConditionIR {
packages/engine/src/ir.ts:134:export interface RuleIR {
packages/engine/src/ir.ts:152:export interface PropertyBucketIR {
packages/engine/src/ir.ts:157:export interface CascadeResolutionIR {
packages/engine/src/ir.ts:166:export interface StyleGraphIR {
packages/engine/src/ir.ts:170:export interface FinalComputedStyleIR {
packages/engine/src/ir.ts:175:export interface SourceLocation {
packages/engine/src/metrics.ts:1:export interface EngineMetricsSnapshot {
packages/engine/src/metricsWriter.ts:17:export interface BuildMetrics {
packages/engine/src/native-bridge.ts:10:interface NativeEngineBinding {
packages/engine/src/plugin-api.ts:4:export interface EnginePluginContext {
packages/engine/src/plugin-api.ts:9:export interface EngineWatchContext {
packages/engine/src/plugin-api.ts:14:export interface EnginePlugin {
packages/engine/src/resolver.ts:141:interface RuleWithProperty {
packages/engine/src/reverseLookup.ts:3:export interface ClassUsage {
packages/engine/src/reverseLookup.ts:11:export interface ReverseLookupResult {      
packages/engine/src/reverseLookup.ts:17:interface ParsedRule {
packages/engine/src/trace.ts:15:export interface VariantTrace {
packages/engine/src/trace.ts:21:export interface RuleTrace {
packages/engine/src/trace.ts:30:export interface ConflictTrace {
packages/engine/src/trace.ts:38:export interface FinalStyleProperty {
packages/engine/src/trace.ts:43:export interface TraceResult {
packages/engine/src/trace.ts:52:export interface ProvenanceData {
packages/engine/src/watch-native.ts:12:interface NativeWatchBinding {
packages/engine/src/watch-native.ts:21:interface NativeWatchOptions {
packages/engine/src/watch-native.ts:56:export interface WatchEvent {
packages/engine/src/watch-native.ts:63:export interface WatchHandle {
packages/engine/src/watch.ts:4:export interface WatcherOptions {
packages/engine/src/watch.ts:13:export interface WatcherEvent {
packages/engine/src/watch.ts:18:export interface WorkspaceWatcher {
packages/next/src/routeCssMiddleware.ts:24:export interface RouteCssManifest {      
packages/next/src/turbopackLoader.ts:8:interface TurbopackContext {
packages/next/src/webpackLoader.ts:8:interface WebpackLoaderOptions extends LoaderOptions {
packages/next/src/webpackLoader.ts:12:interface WebpackContext {
packages/next/src/withTailwindStyled.ts:28:export interface TailwindStyledNextOptions {
packages/plugin/src/index.ts:11:export interface TwClassResult {
packages/plugin/src/index.ts:16:export interface DesignTokens {
packages/plugin/src/index.ts:20:export interface TwPluginOptions {
packages/plugin/src/index.ts:29:export interface UtilityDefinition {
packages/plugin/src/index.ts:33:export interface ComponentConfig {
packages/plugin/src/index.ts:40:export interface TransformMeta {
packages/plugin/src/index.ts:50:export interface TwContext {
packages/plugin/src/index.ts:63:export interface TwPlugin {
packages/plugin/src/index.ts:68:export interface PluginRegistry {
packages/plugin/src/index.ts:101:export interface TwVitePlugin {
packages/plugin/src/index.ts:144:export interface TwGlobalRegistry {
packages/plugin/src/plugins.ts:34:export interface AnimationPluginOptions {
packages/plugin/src/plugins.ts:136:export interface TokensPluginOptions {
packages/plugin/src/plugins.ts:328:export interface TypographyPluginOptions {       
packages/plugin-registry/src/index.ts:8:export interface PluginInfo {
packages/plugin-registry/src/index.ts:19:interface RegistryData {
packages/plugin-registry/src/index.ts:25:export interface InstallResult {
packages/plugin-registry/src/index.ts:41:export interface PluginRegistryErrorPayload {
packages/plugin-registry/src/index.ts:67:export interface InstallOptions {
packages/plugin-registry/src/index.ts:74:export interface RegistryOptions {
packages/rspack/src/index.ts:31:export interface RspackPluginOptions {
packages/rspack/src/loader.ts:12:interface RspackLoaderOptions extends LoaderOptions {
packages/rspack/src/loader.ts:17:interface RspackLoaderContext {
packages/runtime/src/index.ts:36:export interface SubComponentDef {
packages/runtime/src/index.ts:65:export interface ComponentMetadata {
packages/scanner/src/ast-native.ts:27:interface NativeAstBinding {
packages/scanner/src/ast-native.ts:65:export interface AstExtractResult {
packages/scanner/src/cache-native.ts:20:export interface NativeCacheEntry {
packages/scanner/src/cache.ts:4:export interface CachedScanFileEntry {
packages/scanner/src/cache.ts:12:export interface CachedScanIndex {
packages/scanner/src/cache.ts:17:export interface ScanCacheOptions {
packages/scanner/src/in-memory-cache.ts:25:interface NativeCacheBinding {
packages/scanner/src/index.minified.ts:81:export interface ScanWorkspaceOptions {   
packages/scanner/src/index.minified.ts:89:export interface ScanFileResult {
packages/scanner/src/index.minified.ts:94:export interface ScanWorkspaceResult {    
packages/scanner/src/index.ts:97:export interface ScanWorkspaceOptions {
packages/scanner/src/index.ts:105:export interface ScanFileResult {
packages/scanner/src/index.ts:110:export interface ScanWorkspaceResult {
packages/scanner/src/native-bridge.ts:25:interface NativeScannerBinding {
packages/scanner/src/oxc-bridge.ts:26:interface NativeOxcBinding {
packages/shared/dist/index.d.ts:22:interface NativeBindingLoadError {
packages/shared/dist/index.d.ts:26:interface ResolveNativeBindingCandidatesOptions {
packages/shared/dist/index.d.ts:33:interface LoadNativeBindingOptions<T> {
packages/shared/dist/index.d.ts:39:interface LoadNativeBindingResult<T> {
packages/shared/dist/index.d.ts:56:interface Logger {
packages/shared/src/logger.ts:15:export interface Logger {
packages/shared/src/nativeBinding.ts:39:export interface NativeBindingLoadError {
packages/shared/src/nativeBinding.ts:44:export interface ResolveNativeBindingCandidatesOptions {
packages/shared/src/nativeBinding.ts:52:export interface LoadNativeBindingOptions<T> {
packages/shared/src/nativeBinding.ts:59:export interface LoadNativeBindingResult<T> {
packages/storybook-addon/src/index.ts:30:export interface ComponentConfig {
packages/svelte/src/index.ts:40:export interface SvelteComponentConfig {
packages/testing/src/index.ts:242:export interface EngineMetricsSnapshot {
packages/theme/src/index.ts:77:export interface ThemeContract<T extends ThemeTokenMap> {
packages/theme/src/index.ts:88:export interface Theme<T extends ThemeTokenMap> {    
packages/theme/src/index.ts:270:export interface MultiThemeConfig<T extends ThemeTokenMap> {
packages/theme/src/index.ts:333:export interface DesignTokens {
packages/theme/src/liveTokenEngine.ts:6:export interface LiveTokenSet {
packages/theme/src/liveTokenEngine.ts:14:export interface LiveTokenEngineBridge {   
packages/theme/src/native-bridge.ts:7:interface NativeThemeBinding {
packages/vite/src/plugin.ts:24:export interface VitePluginOptions {
packages/vscode/src/health-check.ts:5:export interface HealthCheckResult {
packages/vscode/src/providers/inlineDecorationProvider.ts:9:interface DecorationsMap {
packages/vscode/src/services/engineService.ts:6:export interface ScanResult extends ScanWorkspaceResult {
packages/vscode/src/services/engineService.ts:10:export interface ScanClassName {
packages/vscode/src/services/engineService.ts:23:export interface ScanRule {        
packages/vscode/src/services/engineService.ts:29:export interface ScanStyle {       
packages/vscode/src/services/engineService.ts:37:export interface ScanConflict {    
packages/vscode/src/services/engineService.ts:45:export interface TraceHoverResult {
packages/vscode/src/services/engineService.ts:62:export interface WhyResult {       
packages/vscode/src/services/engineService.ts:72:export interface DoctorResult {    
packages/vscode/src/services/engineService.ts:82:interface ScanCache {
packages/vscode/src/utils/exec-script.ts:5:interface ExecOptions {
packages/vscode/src/utils/exec-script.ts:11:interface ExecResult {
packages/vscode/src/utils/resolve-script.ts:5:interface ResolveOptions {
packages/vue/src/index.ts:33:export interface VueComponentConfig {
260
PS C:\Users\User\Documents\demoPackageNpm\focus\tailwind-styled-v4.5-platform-modify-v3_fixed (1)\library>


























//config
PS C:\Users\User\Documents\demoPackageNpm\focus\tailwind-styled-v4.5-platform-modify-v3_fixed (1)\library> # Cari hardcoded config paths
>> grep -rn "tailwind.config" packages/ --include="*.ts"
>> 
>> # Cari config files
>> find packages/ -name "*config*.ts" -type f
packages/analyzer/src/analyzeWorkspace.ts:91: *   semantic: { tailwindConfigPath: "tailwind.config.js" },
packages/analyzer/src/semantic.ts:217:    "tailwind.config.ts",
packages/analyzer/src/semantic.ts:218:    "tailwind.config.js",
packages/analyzer/src/semantic.ts:219:    "tailwind.config.cjs",
packages/analyzer/src/semantic.ts:220:    "tailwind.config.mjs",
packages/analyzer/src/semantic.ts:325:        `tailwind config cache hit: ${configPath} (${cached.config.safelist.size} safelist entries)`
packages/analyzer/src/semantic.ts:390:    `tailwind config loaded from "${configPath}" in ${Date.now() - startMs}ms ` +
packages/cli/src/commands/doctor.ts:109:  const configFiles = ["tailwind.config.js", "tailwind.config.ts", "tailwind.config.mjs"]
packages/cli/src/commands/doctor.ts:116:      message: "No tailwind.config found",  
packages/cli/src/preflight.ts:183:  const twConfigFiles = ["tailwind.config.ts", "tailwind.config.js", "tailwind.config.mjs"]
packages/cli/src/preflight.ts:191:    "tailwind-config",
packages/cli/src/preflight.ts:203:    (await readJsonSafe<LegacyTailwindConfig>(path.join(cwd, "tailwind.config.js"))) ??
packages/cli/src/preflight.ts:204:    (await readJsonSafe<LegacyTailwindConfig>(path.join(cwd, "tailwind.config.ts")))
packages/cli/src/preflight.ts:237:      if (result.id === "tailwind-config" && result.fix === "tw init") {
packages/cli/src/utils/doctorService.ts:124:        type: "tailwind-config",        
packages/cli/src/utils/doctorService.ts:130:        type: "tailwind-config",        
packages/compiler/src/loadTailwindConfig.ts:4: * Auto-load tailwind config dari project.
packages/compiler/src/loadTailwindConfig.ts:8: *   1. tailwind.config.ts  (TypeScript)
packages/compiler/src/loadTailwindConfig.ts:9: *   2. tailwind.config.js  (JavaScript)
packages/compiler/src/loadTailwindConfig.ts:10: *   3. tailwind.config.mjs (ESM)    
packages/compiler/src/loadTailwindConfig.ts:20:  "tailwind.config.ts",
packages/compiler/src/loadTailwindConfig.ts:21:  "tailwind.config.js",
packages/compiler/src/loadTailwindConfig.ts:22:  "tailwind.config.mjs",
packages/compiler/src/loadTailwindConfig.ts:23:  "tailwind.config.cjs",
packages/compiler/src/loadTailwindConfig.ts:30: * Load tailwind config. Cached per process.
packages/compiler/src/loadTailwindConfig.ts:56:  console.log("[tailwind-styled-v4] No tailwind config found → using built-in preset")
packages/compiler/src/loadTailwindConfig.ts:97: * Check if project has zero-config setup (no user tailwind config)
packages/compiler/src/loadTailwindConfig.ts:104: * Auto-generate tailwind.config.ts dan globals.css jika tidak ada
packages/compiler/src/loadTailwindConfig.ts:114:  // Tailwind v4: CSS-first — tidak perlu tailwind.config.ts
packages/next/src/withTailwindStyled.ts:291:              tailwindConfigPath: zeroConfig ? undefined : "tailwind.config.ts",
packages/preset/src/defaultPreset.ts:5: * tailwind.config.ts / tailwind.config.js di project mereka.
packages/preset/src/defaultPreset.ts:15: *   // tailwind.config.ts
packages/preset/src/defaultPreset.ts:452:// Zero-config tailwind.config.ts generator
FIND: Parameter format not correct
PS C:\Users\User\Documents\demoPackageNpm\focus\tailwind-styled-v4.5-platform-modify-v3_fixed (1)\library>



























//dependecies
PS C:\Users\User\Documents\demoPackageNpm\focus\tailwind-styled-v4.5-platform-modify-v3_fixed (1)\library> # Cari import dari external
>> grep -rn "from 'react'" packages/ --include="*.ts"
>> grep -rn "from 'next'" packages/ --include="*.ts"
>> grep -rn "from 'vite'" packages/ --include="*.ts"
>> 
>> # Cek package.json dependencies
>> cat packages/*/package.json | grep -A 20 "dependencies"
packages/compiler/src/astTransform.ts:565:    source.includes("from 'react'") ||
  "dependencies": {
    "@tailwind-styled/scanner": "^5.0.0",
    "@tailwind-styled/shared": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5",
    "tsup": "^8"
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts --out-dir dist --clean",     
    "dev": "tsup src/index.ts --format cjs,esm --dts --out-dir dist --watch",       
    "clean": "rm -rf dist"
  }
}
{
  "name": "@tailwind-styled/animate",
  "version": "5.0.2",
  "description": "Native-backed async animation DSL for tailwind-styled-v4",        
  "license": "MIT",
  "type": "module",
  "sideEffects": false,
--
  "dependencies": {
    "@tailwind-styled/analyzer": "^5.0.0",
    "@tailwind-styled/shared": "^5.0.0"
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts --out-dir dist --clean",     
    "dev": "tsup src/index.ts --format cjs,esm --dts --out-dir dist --watch"        
  },
  "devDependencies": {
    "tsup": "^8",
    "typescript": "^5"
  }
}
{
  "name": "@tailwind-styled/atomic",
  "version": "5.0.2",
  "description": "Atomic CSS generation for tailwind-styled-v4",
  "type": "module",
  "sideEffects": false,
  "engines": {
    "node": ">=20"
--
  "dependencies": {
    "@clack/prompts": "^1.1.0",
    "@tailwind-styled/analyzer": "^5.0.1",
    "@tailwind-styled/compiler": "^5.0.1",
    "@tailwind-styled/engine": "^5.0.1",
    "@tailwind-styled/next": "^5.0.1",
    "@tailwind-styled/rspack": "^5.0.1",
    "@tailwind-styled/scanner": "^5.0.1",
    "@tailwind-styled/svelte": "^5.0.1",
    "@tailwind-styled/vite": "^5.0.1",
    "@tailwind-styled/vue": "^5.0.1",
    "commander": "^12.1.0",
    "picocolors": "^1.1.1"
  }
}
{
  "name": "@tailwind-styled/compiler",
  "version": "5.0.2",
  "description": "Compiler pipeline for tailwind-styled-v4",
  "license": "MIT",
  "type": "module",
--
  "dependencies": {
    "@tailwind-styled/atomic": "^5.0.0",
    "tailwind-merge": "^3",
    "postcss": "^8",
    "@tailwind-styled/shared": "^5.0.0",
    "@tailwind-styled/plugin": "^5.0.0"
  },
  "optionalDependencies": {
    "oxc-parser": "^0.118.0"
  },
  "peerDependencies": {
    "tailwindcss": "^4",
    "@tailwindcss/postcss": "^4"
  },
  "devDependencies": {
    "@types/node": "^20",
    "tsup": "^8",
    "typescript": "^5"
  },
  "scripts": {
    "build": "tsup src/index.ts src/internal.ts --format cjs,esm --dts --out-dir dist --clean",
--
  "dependencies": {
    "tailwind-merge": "^3",
    "postcss": "^8"
  },
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18"
  },
  "peerDependenciesOptional": {
    "tailwindcss": "^4",
    "@tailwindcss/postcss": "^4"
  },
  "devDependencies": {
    "@tailwind-styled/animate": "^5.0.0",
    "@types/node": "^20",
    "@types/react": "^19",
    "tsup": "^8",
    "typescript": "^5"
  },
  "scripts": {
    "build": "tsup",
--
  "dependencies": {
    "@tailwind-styled/analyzer": "^5.0.0",
    "@tailwind-styled/scanner": "^5.0.0"
  }
}
{
  "name": "@tailwind-styled/engine",
  "version": "5.0.2",
  "description": "Unified build engine for tailwind-styled-v4",
  "license": "MIT",
  "type": "module",
  "sideEffects": false,
  "engines": {
    "node": ">=20"
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
--
  "dependencies": {
    "@tailwind-styled/analyzer": "^5.0.0",
    "@tailwind-styled/compiler": "^5.0.0",
    "@tailwind-styled/scanner": "^5.0.0",
    "@tailwind-styled/shared": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "typescript": "^5",
    "tsup": "^8",
    "vitest": "^2"
  },
  "scripts": {
    "build": "tsup --config tsup.config.ts",
    "dev": "tsup --config tup.config.ts --watch",
    "clean": "rm -rf dist",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
{
--
  "dependencies": {
    "@tailwind-styled/compiler": "^5.0.0",
    "@tailwind-styled/engine": "^5.0.0",
    "@tailwind-styled/plugin": "^5.0.0"
  },
  "peerDependencies": {
    "next": ">=14"
  },
  "devDependencies": {
    "next": ">=14",
    "tsup": "^8",
    "typescript": "^5",
    "@types/node": "^20"
  }
}
{
  "name": "@tailwind-styled/plugin",
  "version": "5.0.2",
  "description": "Plugin system for tailwind-styled-v5 ??? extend compiler pipeline at any stage",
  "license": "MIT",
  "type": "module",
--
  "dependencies": {
    "@tailwind-styled/compiler": "^5.0.0"
  },
  "devDependencies": {
    "tsup": "^8",
    "typescript": "^5"
  }
}
{
  "name": "@tailwind-styled/plugin-registry",
  "version": "5.0.2",
  "description": "Plugin discovery and install helper for the tailwind-styled v5 ecosystem",
  "license": "MIT",
  "type": "module",
  "sideEffects": false,
  "engines": {
    "node": ">=20"
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
--
  "dependencies": {
    "@tailwind-styled/compiler": "^5.0.0",
    "@tailwind-styled/engine": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5",
    "tsup": "^8"
  },
  "scripts": {
    "build": "tsup src/index.ts src/loader.ts --format cjs,esm --out-dir dist --clean --external typescript",
    "dev": "tsup src/index.ts src/loader.ts --format cjs,esm --out-dir dist --watch --external typescript",
    "clean": "rm -rf dist"
  }
}
{
  "name": "@tailwind-styled/runtime",
  "version": "5.0.2",
  "description": "Runtime helpers for tailwind-styled-v5 compound components",      
  "license": "MIT",
  "type": "module",
  "engines": {
--
  "dependencies": {},
  "peerDependencies": {
    "react": ">=17"
  },
  "devDependencies": {
    "@types/react": "^19",
    "tsup": "^8",
    "typescript": "^5"
  },
  "sideEffects": false
}
{
  "name": "@tailwind-styled/runtime-css",
  "version": "5.0.2",
  "description": "RSC-aware CSS injector for tailwind-styled-v5 ??? streaming-friendly, zero client JS",
  "license": "MIT",
  "type": "module",
  "sideEffects": false,
  "engines": {
    "node": ">=20"
  },
--
  "dependencies": {
    "@tailwind-styled/compiler": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5",
    "tsup": "^8"
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts --out-dir dist --clean --external typescript",
    "dev": "tsup src/index.ts --format cjs,esm --dts --out-dir dist --watch --external typescript",
    "clean": "rm -rf dist"
  }
}
{
  "name": "@tailwind-styled/shared",
  "version": "5.0.2",
  "description": "Shared utilities for tailwind-styled monorepo ??? LRUCache, logger, hash, timing, version",
  "type": "module",
  "sideEffects": false,
  "engines": {
    "node": ">=20"
--
  "dependencies": {
    "electron-updater": "^6.0.0",
    "@tailwind-styled/engine": "^5.0.0",
    "@tailwind-styled/scanner": "^5.0.0",
    "@tailwind-styled/shared": "^5.0.0"
  },
  "devDependencies": {},
  "engines": {
    "node": ">=20.0.0"
  },
  "optionalDependencies": {
    "electron": "^35.7.5",
    "electron-builder": "^26.8.1"
  }
}
{
  "name": "@tailwind-styled/svelte",
  "version": "5.0.2",
  "description": "Svelte 4/5 adapter for tailwind-styled-v4 ??? cv(), tw(), and use:styled action",
  "type": "module",
  "main": "./dist/index.cjs",
--
  "dependencies": {
    "@tailwind-styled/compiler": "^5.0.0",
    "@tailwind-styled/engine": "^5.0.0",
    "@tailwind-styled/scanner": "^5.0.0"
  },
  "peerDependencies": {
    "vite": ">=6.2.0"
  },
  "devDependencies": {
    "tsup": "^8",
    "typescript": "^5",
    "@types/node": "^20",
    "vitest": "^2"
  }
}
{
  "name": "tailwind-styled-vscode",
  "version": "5.0.2",
  "displayName": "Tailwind Styled VS Code",
  "description": "VS Code extension for Tailwind Styled - trace, doctor, and why commands",
  "publisher": "tailwind-styled",
--
  "dependencies": {
    "@tailwind-styled/engine": "^5.0.0"
  }
}
{
  "name": "@tailwind-styled/vue",
  "version": "5.0.2",
  "description": "Vue 3 adapter for tailwind-styled-v4 ??? tw() components with variants",
  "type": "module",
  "sideEffects": false,
  "engines": {
    "node": ">=20"
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
PS C:\Users\User\Documents\demoPackageNpm\focus\tailwind-styled-v4.5-platform-modify-v3_fixed (1)\library>




//zero bundle
PS C:\Users\User\Documents\demoPackageNpm\focus\tailwind-styled-v4.5-platform-modify-v3_fixed (1)\library> # Cari CSS generation
>> grep -rn "generateCSS\|css generation" packages/ --include="*.ts"
>> 
>> # Cari CSS injection
>> grep -rn "injectCSS\|style injection" packages/ --include="*.ts"
PS C:\Users\User\Documents\demoPackageNpm\focus\tailwind-styled-v4.5-platform-modify-v3_fixed (1)\library> 






//zero-runtime
PS C:\Users\User\Documents\demoPackageNpm\focus\tailwind-styled-v4.5-platform-modify-v3_fixed (1)\library> # Cari runtime style injection
>> grep -rn "createElement\|style={}" packages/ --include="*.tsx"
>> grep -rn "css-in-js\|styled-components" packages/ --include="*.ts"
packages/cli/src/migrate.ts:62:    output = output.replace(/tailwind-styled-components/g, () => {
packages/cli/src/migrateWizard.ts:37:    message: "Migrasi import tailwind-styled-components -> tailwind-styled-v4?",



// ================================================================
// SESSION: Unsafe Type Assertions + Type Consolidation + Phase 3
// Date: 2026-04-02
// ================================================================

## Unsafe Type Assertions Audit & Fix

### Before → After
- `as any`:           33+ → 0   (eliminated)
- `as unknown as`:    17  → 2   (only genuine: twProxy.ts:234, runtime/index.ts:173)
- `window as any`:    10+ → 0   (eliminated)
- `@ts-ignore`:       0   → 0   (clean)
- `console.log/warn`: 76  → 76  (52 CLI, 24 user-facing — appropriate)

### Files Changed
- `packages/shared/src/global.d.ts` — CREATED: centralized Window.__TW_*__ augmentations
- `packages/devtools/package.json` — Added @tailwind-styled/shared dependency
- `packages/devtools/src/index.tsx` — Eliminated all 10+ window as any casts
- `packages/core/src/styledSystem.ts` — Removed 8 tokens as unknown as SystemTokenMap
- `packages/core/src/createComponent.ts` — Removed 4 as unknown as casts
- `packages/core/src/twProxy.ts` — Simplified serverFactories cast
- `packages/core/src/registry.ts` — Simplified withSubComponents return cast
- `packages/runtime/src/index.ts` — Simplified return cast (kept 1 necessary as unknown as)
- `packages/shared/src/trace.ts` — Replaced as any with nested type assertion

## Type Consolidation (Phase 1 & 2)

### Duplicates Eliminated
- `VariantValue`:    shared + core/types → shared only
- `VariantProps`:    shared + core/types → shared only
- `HtmlTagName`:     shared + core/types → shared only
- `CompoundCondition`: shared + compiler/variantCompiler + staticVariantCompiler → shared only
- `VariantMatrix`:   core/types + storybook-addon → shared only

### Files Changed
- `packages/shared/src/index.ts` — Added VariantMatrix type
- `packages/core/src/types.ts` — Import from shared, re-export for backward compat
- `packages/compiler/src/variantCompiler.ts` — Import CompoundCondition from shared
- `packages/compiler/src/staticVariantCompiler.ts` — Import CompoundCondition from shared
- `packages/storybook-addon/src/index.ts` — Import VariantMatrix from shared
- `packages/storybook-addon/package.json` — Added @tailwind-styled/shared dependency

## Phase 3: AST Optimizer Integration (Rust)

### Changes
- `native/src/lib.rs`:
  - Removed #[allow(dead_code)] from should_use_ast_for_templates()
  - Refactored transform_source() STEP 1 into hybrid AST/regex path
  - AST path for >5KB files with 3+ templates
  - Regex fallback for small files or AST errors
- `native/src/ast_optimizer.rs`:
  - Removed #[allow(dead_code)] from AstTemplateMatch struct and extract_templates_from_ast()

### Results
- Tests: 62 → 67 (+5 AST tests)
- Cargo warnings: 1 → 0
- AST module: dead code → integrated into transform pipeline

## Verification
- TypeScript: tsc --noEmit CLEAN
- Rust: cargo check 0 warnings
- Rust tests: 67/67 passed
PS C:\Users\User\Documents\demoPackageNpm\focus\tailwind-styled-v4.5-platform-modify-v3_fixed (1)\library> 
























