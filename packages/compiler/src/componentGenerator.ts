/**
 * tailwind-styled-v4 — componentGenerator
 *
 * Mengubah hasil compiler menjadi static React component.
 * Output tidak butuh runtime variant engine — pure className props.
 *
 * Input:  tw.div`p-4 bg-white`
 * Output: React.forwardRef((props, ref) => <div ref={ref} {...props} className={twMerge("p-4 bg-white", props.className)} />)
 */

import { normalizeClasses } from "./classMerger"

export interface GenerateOptions {
  /** tambah RSC boundary hint */
  rscHint?: boolean
  /** tambah "use client" jika ada interactive features */
  autoClientBoundary?: boolean
  /** tambah data-tw debug attribute */
  addDataAttr?: boolean
  /** hash untuk component ID */
  hash?: string
}

/**
 * Generate static component untuk tw.tag`classes`
 */
export function generateStaticComponent(
  varName: string,
  tag: string,
  classes: string,
  opts: GenerateOptions = {}
): string {
  const normalized = normalizeClasses(classes)
  const dataAttr = opts.addDataAttr && opts.hash ? ` "data-tw": "${opts.hash}",` : ""

  return `const ${varName} = /*@tw-static*/ React.forwardRef(function ${varName}(props, ref) {
  const { className, ...rest } = props;
  return React.createElement("${tag}", {
    ref,
    ...rest,${dataAttr}
    className: [${JSON.stringify(normalized)}, className].filter(Boolean).join(" "),
  });
});`
}

/**
 * Generate variant component untuk tw.tag({ base, variants })
 */
export function generateVariantComponent(
  varName: string,
  tag: string,
  id: string,
  base: string,
  defaultVariants: Record<string, string>,
  variantKeys: string[],
  opts: GenerateOptions = {}
): string {
  const dataAttr = opts.addDataAttr ? ` "data-tw": "${varName}",` : ""
  const _defaults = JSON.stringify(defaultVariants)

  const variantResolution = variantKeys
    .map((k) => `const __v_${k} = props.${k} ?? ${JSON.stringify(defaultVariants[k] ?? null)};`)
    .join("\n  ")

  const classLookups = variantKeys.map((k) => `(__vt_${id}.${k}?.[__v_${k}] ?? "")`).join(", ")

  return `const ${varName} = /*@tw-variant*/ React.forwardRef(function ${varName}(props, ref) {
  const { className, ${variantKeys.join(", ")}, ...rest } = props;
  ${variantResolution}
  const __cls = [${JSON.stringify(base)}, ${classLookups}, className].filter(Boolean).join(" ");
  return React.createElement("${tag}", {
    ref,
    ...rest,${dataAttr}
    className: __cls,
  });
});`
}

/**
 * Generate "use client" directive if interactive features detected
 */
export function maybeClientDirective(source: string, classes: string): string {
  const interactive =
    /\b(hover:|focus:|active:|group-hover:|peer-|useState|useEffect|useRef|onClick|onChange)\b/
  if (interactive.test(classes) || interactive.test(source)) {
    if (!source.startsWith('"use client"') && !source.startsWith("'use client'")) {
      return '"use client";\n'
    }
  }
  return ""
}
