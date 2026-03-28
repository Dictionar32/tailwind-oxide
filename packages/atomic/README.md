# @tailwind-styled/atomic

Atomic CSS generation for tailwind-styled-v4.

## Installation

```bash
npm install @tailwind-styled/atomic
```

## Usage

```typescript
import { parseAtomicClass, toAtomicClasses } from "@tailwind-styled/atomic"

// Parse single class
const rule = parseAtomicClass("p-4")
// → { twClass: "p-4", atomicName: "_tw_p_4", property: "padding", value: "1rem" }

// Convert class string
const { atomicClasses, rules } = toAtomicClasses("p-4 bg-blue-500")
```

## API

### parseAtomicClass(twClass: string)
Parses a single Tailwind class into an AtomicRule.

### toAtomicClasses(twClasses: string)
Converts a class string into atomic classes.

### generateAtomicCss(rules: AtomicRule[])
Generates CSS string from atomic rules.

### getAtomicRegistry()
Returns the atomic registry Map.

### clearAtomicRegistry()
Clears the atomic registry.