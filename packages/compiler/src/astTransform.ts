/**
 * tailwind-styled-v4 v2 — AST Transform (RSC-Aware)
 */

import {
  type CompoundCondition,
  getGlobalRegistry,
  type ComponentConfig as PluginComponentConfig,
} from "@tailwind-styled/plugin-api"
import { normalizeClasses } from "./classMerger"
import { hoistComponents } from "./componentHoister"
import { analyzeFile, injectClientDirective, type RscAnalysis } from "./rscAnalyzer"
import { TransformOptionsSchema } from "./schemas"
import { hasTwUsage, isAlreadyTransformed, isDynamic, TRANSFORM_MARKER } from "./twDetector"
import { compileVariants, generateVariantCode, parseObjectConfig } from "./variantCompiler"

export type ComponentConfig = PluginComponentConfig
type CompoundVariantConfig = { class: string } & CompoundCondition

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TransformOptions {
  mode?: "zero-runtime"
  autoClientBoundary?: boolean
  addDataAttr?: boolean
  hoist?: boolean
  filename?: string
  preserveImports?: boolean
  deadStyleElimination?: boolean
}

export interface TransformResult {
  code: string
  classes: string[]
  rsc?: {
    isServer: boolean
    needsClientDirective: boolean
    clientReasons: string[]
  }
  changed: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Patterns
// ─────────────────────────────────────────────────────────────────────────────

const TEMPLATE_RE = /\btw\.(server\.)?(\w+)`((?:[^`\\]|\\.)*)`/g
const OBJECT_RE = /\btw\.(server\.)?(\w+)\(\s*(\{[\s\S]*?\})\s*\)/g
const EXTEND_RE = /(\w+)\.extend`((?:[^`\\]|\\.)*)`/g
const WRAP_RE = /\btw\((\w+)\)`((?:[^`\\]|\\.)*)`/g

const idState = { current: 0 }
const _getId = () => `c${(++idState.current).toString(36)}`

// ─────────────────────────────────────────────────────────────────────────────
// Render functions (sama seperti sebelumnya)
// ─────────────────────────────────────────────────────────────────────────────

const renderStaticComponent = (
  tag: string,
  classes: string,
  opts: { addDataAttr: boolean; isServer: boolean; compName?: string }
): string => {
  const { addDataAttr, compName } = opts
  const fnName = compName ? `_Tw_${compName}` : `_Tw_${tag}`
  const dataAttr = addDataAttr
    ? `, "data-tw": "${fnName}:${classes.split(" ").slice(0, 3).join(" ")}${classes.split(" ").length > 3 ? "..." : ""}"`
    : ""

  return `React.forwardRef(function ${fnName}(props, ref) {
  var _c = props.className;
  var _r = Object.assign({}, props);
  delete _r.className;
  return React.createElement("${tag}", Object.assign({ ref }, _r${dataAttr}, { className: [${JSON.stringify(classes)}, _c].filter(Boolean).join(" ") }));
})`
}

const renderVariantComponent = (
  tag: string,
  id: string,
  base: string,
  variantKeys: string[],
  defaults: Record<string, string>,
  opts: { addDataAttr: boolean; isServer: boolean }
): string => {
  const { addDataAttr } = opts
  const fnName = `_TwV_${tag}_${id}`
  const dataAttr = addDataAttr ? `, "data-tw": "${fnName}"` : ""

  const vKeys = variantKeys.map((k) => `"${k}"`).join(", ")
  const destructure =
    variantKeys.length > 0
      ? `var _vp = {}; [${vKeys}].forEach(function(k){ _vp[k] = props[k]; delete _rest[k]; });`
      : ""

  const variantLookup =
    variantKeys.length > 0
      ? variantKeys
          .map(
            (k) =>
              `(__vt_${id}["${k}"] && __vt_${id}["${k}"][_vp["${k}"] ?? ${JSON.stringify(defaults[k] ?? "")}] || "")`
          )
          .join(", ")
      : ""

  const classParts =
    variantKeys.length > 0
      ? `[${JSON.stringify(base)}, ${variantLookup}, _rest.className]`
      : `[${JSON.stringify(base)}, _rest.className]`

  return `React.forwardRef(function ${fnName}(props, ref) {
  var _rest = Object.assign({}, props);
  delete _rest.className;
  ${destructure}
  return React.createElement("${tag}", Object.assign({ ref }, _rest${dataAttr}, { className: ${classParts}.filter(Boolean).join(" ") }));
})`
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponent block parser
// ─────────────────────────────────────────────────────────────────────────────

const SUB_BLOCK_RE = /\b([a-z][a-zA-Z0-9_]*)\s*\{([^}]*)\}/g

interface SubComponentBlock {
  name: string
  tag: string
  classes: string
  scopedClass: string
}

const shortHash = (input: string): string => {
  return input
    .split("")
    .reduce((acc, char) => (Math.imul(acc, 33) + char.charCodeAt(0)) >>> 0, 5381)
    .toString(16)
    .padStart(6, "0")
    .slice(-6)
}

const parseSubcomponentBlocks = (
  template: string,
  componentName: string
): { baseContent: string; subComponents: SubComponentBlock[] } => {
  const matches = [...template.matchAll(SUB_BLOCK_RE)]

  const baseContent = matches.reduce((acc, match) => acc.replace(match[0], ""), template)

  const subComponents = matches
    .map((match) => {
      const [, subName, subClassesRaw] = match
      const subClasses = subClassesRaw.trim()
      if (!subClasses) return null

      const subTag = (() => {
        switch (subName) {
          case "label":
            return "label"
          case "input":
            return "input"
          case "img":
          case "image":
            return "img"
          case "header":
            return "header"
          case "footer":
            return "footer"
          default:
            return "span"
        }
      })()

      const hash = shortHash(`${componentName}_${subName}_${subClasses}`)
      const scopedClass = `${componentName}_${subName}_${hash}`

      return { name: subName, tag: subTag, classes: subClasses, scopedClass }
    })
    .filter((item): item is SubComponentBlock => item !== null)

  return { baseContent: baseContent.trim(), subComponents }
}

const renderCompoundComponent = (
  tag: string,
  baseClasses: string,
  componentName: string,
  subComponents: SubComponentBlock[],
  opts: { addDataAttr: boolean }
): string => {
  const fnName = `_Tw_${componentName}`
  const dataAttr = opts.addDataAttr ? `, "data-tw": "${fnName}"` : ""

  const baseBody = `React.forwardRef(function ${fnName}(props, ref) {
  var _c = props.className;
  var _r = Object.assign({}, props);
  delete _r.className;
  return React.createElement("${tag}", Object.assign({ ref }, _r${dataAttr}, { className: [${JSON.stringify(baseClasses)}, _c].filter(Boolean).join(" ") }));
})`

  if (subComponents.length === 0) return baseBody

  const subAssignments = subComponents
    .map((sub) => {
      const subFn = `_Tw_${componentName}_${sub.name}`
      return `  _base.${sub.name} = React.forwardRef(function ${subFn}(props, ref) {
    var _c = props.className;
    var _r = Object.assign({}, props);
    delete _r.className;
    return React.createElement("${sub.tag}", Object.assign({ ref }, _r, { className: [${JSON.stringify(sub.scopedClass)}, _c].filter(Boolean).join(" ") }));
  });`
    })
    .join("\n")

  return `(function() {
  var _base = ${baseBody};
${subAssignments}
  return _base;
})()`
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────────────────────────────────────

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

const isStringRecord = (value: unknown): value is Record<string, string> => {
  return isObjectRecord(value) && Object.values(value).every((entry) => typeof entry === "string")
}

const isVariantRecord = (value: unknown): value is Record<string, Record<string, string>> => {
  return isObjectRecord(value) && Object.values(value).every((entry) => isStringRecord(entry))
}

const isCompoundVariantsArray = (value: unknown): value is CompoundVariantConfig[] => {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        isObjectRecord(entry) &&
        typeof entry.class === "string" &&
        Object.entries(entry).every(([key, item]) => key === "class" || typeof item === "string")
    )
  )
}

const hasReactImport = (source: string): boolean => {
  return (
    source.includes("import React") ||
    /import\s+\{[^}]*\bReact\b[^}]*\}\s*from\s+['"]react['"]/.test(source)
  )
}

const findAfterImports = (source: string): number => {
  const lines = source.split("\n")
  const lastImportIdx = lines.reduce((lastIdx, line, idx) => {
    const trimmed = line.trim()
    if (
      trimmed.startsWith("import ") ||
      trimmed.startsWith('"use client"') ||
      trimmed.startsWith("'use client'") ||
      trimmed.startsWith(TRANSFORM_MARKER) ||
      trimmed === ""
    ) {
      return idx
    }
    return lastIdx
  }, 0)

  return lines.slice(0, lastImportIdx + 1).join("\n").length + 1
}

// ─────────────────────────────────────────────────────────────────────────────
// Main transform — RSC-Aware pipeline (Zero Let!)
// ─────────────────────────────────────────────────────────────────────────────

export const transformSource = (source: string, rawOpts: TransformOptions = {}): TransformResult => {
  // ── Boundary validation: validate transform options with Zod ──
  const optsParse = TransformOptionsSchema.safeParse(rawOpts)
  if (!optsParse.success) {
    const issues = optsParse.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ")
    console.warn(`[tailwind-styled] Invalid transform options: ${issues}`)
    return { code: source, classes: [], changed: false }
  }
  const opts = optsParse.data

  const {
    mode = "zero-runtime",
    autoClientBoundary = true,
    addDataAttr = false,
    hoist = true,
    filename = "",
    preserveImports = false,
  } = opts

  // ── Fast exits ────────────────────────────────────────────────────────
  if (!hasTwUsage(source)) {
    return { code: source, classes: [], changed: false }
  }

  if (isAlreadyTransformed(source)) {
    return { code: source, classes: [], changed: false }
  }

  if (mode && mode !== "zero-runtime") {
    console.warn(
      "[tailwind-styled] Warning: mode option is deprecated in v5. Only zero-runtime is supported."
    )
  }

  // ── STEP 1: RSC Analysis ───────────────────────────────────────────────
  const rscAnalysis = analyzeFile(source, filename)

  // ── STEP 2: Component Hoisting ─────────────────────────────────────────
  const code = (() => {
    if (!hoist) return source
    const hoistResult = hoistComponents(source)
    if (hoistResult.hoisted.length > 0) {
      if (process.env.NODE_ENV !== "production") {
        for (const w of hoistResult.warnings) {
          console.warn(w)
        }
      }
      return hoistResult.code
    }
    return source
  })()

  // ── STEP 3: Process all transformations with reduce (no let!) ─────────
  const { finalCode, allClasses, changed } = processAllTransformations(code, {
    rscAnalysis,
    addDataAttr,
    autoClientBoundary,
    preserveImports,
  })

  return {
    code: finalCode,
    classes: Array.from(new Set(allClasses)),
    rsc: {
      isServer: rscAnalysis.isServer,
      needsClientDirective: rscAnalysis.needsClientDirective,
      clientReasons: rscAnalysis.clientReasons,
    },
    changed,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure function - No let! All transformations with reduce
// ─────────────────────────────────────────────────────────────────────────────

const processAllTransformations = (
  initialCode: string,
  context: {
    rscAnalysis: RscAnalysis
    addDataAttr: boolean
    autoClientBoundary: boolean
    preserveImports: boolean
  }
): { finalCode: string; allClasses: string[]; changed: boolean } => {
  const { rscAnalysis, addDataAttr, autoClientBoundary, preserveImports } = context

  // Build assign map for template matching
  const assignMap = new Map<number, string>()
  const assignMatches = [
    ...initialCode.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*tw\.(?:server\.)?(\w+)`/g),
  ]
  for (const am of assignMatches) {
    const twPos = am.index + am[0].indexOf("tw.")
    assignMap.set(twPos, am[1])
  }

  // Process template literals
  const templateMatches = [...initialCode.matchAll(TEMPLATE_RE)]
  const afterTemplate = templateMatches.reduce(
    (acc, m) => {
      const [fullMatch, serverMark, tag, content] = m
      if (isDynamic(content)) return acc

      const isServerOnly = !!serverMark
      const compName = assignMap.get(m.index) ?? null
      const { baseContent, subComponents } = compName
        ? parseSubcomponentBlocks(content, compName)
        : { baseContent: content, subComponents: [] }

      const classes = normalizeClasses(baseContent)
      if (!classes && subComponents.length === 0) return acc

      const newClasses = [...acc.allClasses]
      if (classes) newClasses.push(...classes.split(/\s+/).filter(Boolean))
      for (const sub of subComponents) {
        newClasses.push(...sub.classes.split(/\s+/).filter(Boolean))
      }

      const rendered = (() => {
        if (subComponents.length > 0 && compName) {
          return renderCompoundComponent(tag, classes ?? "", compName, subComponents, {
            addDataAttr,
          })
        }
        return renderStaticComponent(tag, classes ?? "", {
          addDataAttr,
          isServer: rscAnalysis.isServer || isServerOnly,
          compName: compName ?? undefined,
        })
      })()

      const replacement = isServerOnly ? `/* @server-only */ ${rendered}` : rendered
      const newCode = acc.code.replace(fullMatch, replacement)

      return {
        code: newCode,
        allClasses: newClasses,
        prelude: acc.prelude,
        changed: true,
        needsReact: true,
      }
    },
    {
      code: initialCode,
      allClasses: [] as string[],
      prelude: [] as string[],
      changed: false,
      needsReact: false,
    }
  )

  // Process object configs
  const objectMatches = [...afterTemplate.code.matchAll(OBJECT_RE)]
  const afterObject = objectMatches.reduce(
    (acc, match) => {
      const [fullMatch, serverMark, tag, objectStr] = match
      const { base, variants, compounds, defaults } = parseObjectConfig(objectStr)
      const initialConfig: ComponentConfig = {
        base,
        variants,
        compoundVariants: isCompoundVariantsArray(compounds) ? compounds : [],
        defaultVariants: defaults,
      }

      const registry = getGlobalRegistry()
      const config =
        registry.transforms.length > 0
          ? registry.transforms.reduce<ComponentConfig>((currentConfig, transform) => {
              const componentName = `Tw${tag}`
              try {
                const transformed = transform(currentConfig, { componentName, tag })
                if (transformed && typeof transformed === "object") {
                  return {
                    base:
                      typeof transformed.base === "string" ? transformed.base : currentConfig.base,
                    variants: isVariantRecord(transformed.variants)
                      ? transformed.variants
                      : currentConfig.variants,
                    compoundVariants: isCompoundVariantsArray(transformed.compoundVariants)
                      ? transformed.compoundVariants
                      : currentConfig.compoundVariants,
                    defaultVariants: isStringRecord(transformed.defaultVariants)
                      ? transformed.defaultVariants
                      : currentConfig.defaultVariants,
                  }
                }
              } catch (error) {
                if (process.env.NODE_ENV !== "production") {
                  console.warn("[tailwind-styled] plugin transform error:", error)
                }
              }
              return currentConfig
            }, initialConfig)
          : initialConfig

      const nextBase = normalizeClasses(config.base) ?? ""
      const nextVariants = config.variants
      const nextCompounds = config.compoundVariants
      const nextDefaults = config.defaultVariants

      if (!nextBase && Object.keys(nextVariants).length === 0) return acc

      const isServerOnly = !!serverMark
      const newClasses = [...acc.allClasses, ...nextBase.split(/\s+/).filter(Boolean)]
      for (const vMap of Object.values(nextVariants)) {
        for (const cls of Object.values(vMap)) {
          newClasses.push(...cls.split(/\s+/).filter(Boolean))
        }
      }

      const id = _getId()
      const compiled = compileVariants(nextBase, nextVariants, nextCompounds, nextDefaults)
      const variantKeys = Object.keys(nextVariants)
      const rendered = renderVariantComponent(tag, id, nextBase, variantKeys, nextDefaults, {
        addDataAttr,
        isServer: rscAnalysis.isServer || isServerOnly,
      })

      const replacement = isServerOnly ? `/* @server-only */ ${rendered}` : rendered
      const newCode = acc.code.replace(fullMatch, replacement)
      const newPrelude = [...acc.prelude, generateVariantCode(id, compiled)]

      return {
        code: newCode,
        allClasses: newClasses,
        prelude: newPrelude,
        changed: true,
        needsReact: true,
      }
    },
    {
      code: afterTemplate.code,
      allClasses: afterTemplate.allClasses,
      prelude: afterTemplate.prelude,
      changed: afterTemplate.changed,
      needsReact: afterTemplate.needsReact,
    }
  )

  // Process wrap and extend
  const wrapMatches = [...afterObject.code.matchAll(WRAP_RE)]
  const extendMatches = [...afterObject.code.matchAll(EXTEND_RE)]
  const allMatches = [...wrapMatches, ...extendMatches]

  const afterWrapExtend = allMatches.reduce(
    (acc, match) => {
      const [fullMatch, compName, content] = match
      if (isDynamic(content)) return acc

      const extra = normalizeClasses(content)
      if (!extra) return acc

      const newClasses = [...acc.allClasses, ...extra.split(/\s+/).filter(Boolean)]
      const isWrap = fullMatch.startsWith("tw(")
      const replacement = isWrap
        ? `React.forwardRef(function _TwWrap_${compName}(props, ref) {
  var _c = [${JSON.stringify(extra)}, props.className].filter(Boolean).join(" ");
  return React.createElement(${compName}, Object.assign({}, props, { ref, className: _c }));
})`
        : `(function() {
  var _ext = React.forwardRef(function _TwExt_${compName}(props, ref) {
    var _c = [${JSON.stringify(extra)}, props.className].filter(Boolean).join(" ");
    return React.createElement(${compName}, Object.assign({}, props, { ref, className: _c }));
  });
  var _keys = Object.keys(${compName});
  for (var _i = 0; _i < _keys.length; _i++) {
    if (_keys[_i] !== "displayName" && _keys[_i] !== "length" && _keys[_i] !== "name") {
      _ext[_keys[_i]] = ${compName}[_keys[_i]];
    }
  }
  return _ext;
})()`

      const newCode = acc.code.replace(fullMatch, replacement)
      return {
        code: newCode,
        allClasses: newClasses,
        prelude: acc.prelude,
        changed: true,
        needsReact: true,
      }
    },
    {
      code: afterObject.code,
      allClasses: afterObject.allClasses,
      prelude: afterObject.prelude,
      changed: afterObject.changed,
      needsReact: afterObject.needsReact,
    }
  )

  if (!afterWrapExtend.changed) {
    return { finalCode: initialCode, allClasses: [], changed: false }
  }

  // Final code assembly — chained transformations (Zero Let!)
  const resultCode = [
    // Step 1: Insert prelude after imports
    (code: string) => {
      if (afterWrapExtend.prelude.length > 0) {
        const importEnd = findAfterImports(code)
        return `${code.slice(0, importEnd)}\n${afterWrapExtend.prelude.join("\n")}\n${code.slice(importEnd)}`
      }
      return code
    },
    // Step 2: Add React import if needed
    (code: string) =>
      afterWrapExtend.needsReact && !hasReactImport(initialCode)
        ? `import React from "react";\n${code}`
        : code,
    // Step 3: Inject client directive
    (code: string) =>
      autoClientBoundary && rscAnalysis.needsClientDirective ? injectClientDirective(code) : code,
    // Step 4: Clean up unused imports
    (code: string) => {
      if (!preserveImports) {
        const stillUsesTw = /\btw\.(server\.)?\w+[`(]/.test(code) || /\btw\(\w+\)/.test(code)
        if (!stillUsesTw) {
          return code.replace(
            /import\s*\{[^}]*\btw\b[^}]*\}\s*from\s*["']tailwind-styled-v4["'];?\n?/g,
            ""
          )
        }
      }
      return code
    },
    // Step 5: Prepend transform marker
    (code: string) => `${TRANSFORM_MARKER}\n${code}`,
  ].reduce((code, fn) => fn(code), afterWrapExtend.code)

  return {
    finalCode: resultCode,
    allClasses: afterWrapExtend.allClasses,
    changed: true,
  }
}

export { hasTwUsage as shouldProcess }
