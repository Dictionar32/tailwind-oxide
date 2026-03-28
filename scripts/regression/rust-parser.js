#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')

function loadScanner() {
  const scannerCjs = path.resolve(process.cwd(), 'packages/scanner/dist/index.cjs')
  if (!fs.existsSync(scannerCjs)) {
    throw new Error('packages/scanner/dist/index.cjs not found. Run `npm run build -w @tailwind-styled/scanner` first.')
  }
  return require(scannerCjs)
}

function hasToken(classes, expected) {
  return Array.isArray(classes) && classes.includes(expected)
}

function run() {
  fs.mkdirSync(path.resolve(process.cwd(), 'artifacts/regression'), { recursive: true })

  const { scanSource } = loadScanner()

  const results = {
    os: process.platform,
    node: process.version,
    timestamp: new Date().toISOString(),
    nativeBindingFound: false,
    nativePath: null,
    staticClassScanOk: false,
    dynamicClassScanOk: false,
    passed: false,
  }

  const nativeCandidates = [
    path.resolve(process.cwd(), 'native/tailwind_styled_parser.node'),
    path.resolve(process.cwd(), 'native/build/Release/tailwind_styled_parser.node'),
  ]

  for (const candidate of nativeCandidates) {
    if (fs.existsSync(candidate)) {
      results.nativeBindingFound = true
      results.nativePath = candidate
      break
    }
  }

  const staticInput = '<div className="p-4 text-sm md:p-6" />'
  const staticClasses = scanSource(staticInput)
  results.staticClassScanOk = hasToken(staticClasses, 'p-4') && hasToken(staticClasses, 'md:p-6')

  const dynamicInput = 'className={`bg-${color}-500 p-2 hover:bg-blue-600`}'
  const dynamicClasses = scanSource(dynamicInput)
  results.dynamicClassScanOk = Array.isArray(dynamicClasses)

  results.passed = results.staticClassScanOk && results.dynamicClassScanOk

  const outFile = path.resolve(
    process.cwd(),
    `artifacts/regression/rust-parser-${process.platform}-${process.version.replace(/[^\w.-]/g, '_')}.json`
  )

  fs.writeFileSync(outFile, JSON.stringify(results, null, 2))

  console.log(`[regression] wrote ${path.relative(process.cwd(), outFile)}`)
  console.log(
    `[regression] static=${results.staticClassScanOk} dynamic=${results.dynamicClassScanOk} nativeFound=${results.nativeBindingFound}`
  )

  process.exit(results.passed ? 0 : 1)
}

run()
