# @tailwind-styled/storybook-addon

Storybook helpers for tailwind-styled variant previews.

## Installation

```bash
npm install @tailwind-styled/storybook-addon@5
```

## Setup

### Add Decorator

In `.storybook/preview.ts`:

```typescript
import { withTailwindStyled } from "@tailwind-styled/storybook-addon"

export const decorators = [withTailwindStyled]
```

The decorator adds a wrapper div with configurable padding around your stories.

## Usage

### Generate ArgTypes Automatically

In your story file:

```typescript
import { generateArgTypes } from "@tailwind-styled/storybook-addon"
import { MyComponent } from "./MyComponent"

export default {
  title: "Components/MyComponent",
  component: MyComponent,
  argTypes: generateArgTypes(MyComponent.config),
}
```

### Display All Variants

```typescript
import { createVariantStoryArgs } from "@tailwind-styled/storybook-addon"

export const AllVariants = {
  render: () => {
    const { combinations } = createVariantStoryArgs(MyComponent.config)
    return (
      <div className="flex flex-wrap gap-4">
        {combinations.map((props, i) => (
          <MyComponent key={i} {...props} />
        ))}
      </div>
    )
  },
}
```

### Get Variant Class

```typescript
import { getVariantClass } from "@tailwind-styled/storybook-addon"

const cls = getVariantClass(MyComponent.config, { size: "lg", intent: "primary" })
// -> "btn btn-lg btn-primary"
```

## API Reference

### enumerateVariantProps(matrix)

Generates all combinations of variant props.

**Parameters:**
- `matrix` - Object mapping variant names to arrays of possible values

**Returns:** Array of all possible combinations

**Example:**
```typescript
const variants = enumerateVariantProps({ size: ["sm", "md"], intent: ["primary", "danger"] })
// -> [{ size: "sm", intent: "primary" }, { size: "sm", intent: "danger" }, ...]
```

### generateArgTypes(config)

Generates Storybook argTypes from a component config.

**Parameters:**
- `config` - ComponentConfig object with variants and defaultVariants

**Returns:** Object suitable for Storybook argTypes

### generateDefaultArgs(config)

Returns default variant args from config.

**Parameters:**
- `config` - ComponentConfig object

**Returns:** Object with default variant values

### getVariantClass(config, props)

Calculates the CSS class string based on config and props.

**Parameters:**
- `config` - ComponentConfig object
- `props` - Current props including variants

**Returns:** CSS class string

### createVariantStoryArgs(config)

Creates variant story args for displaying all combinations.

**Parameters:**
- `config` - ComponentConfig object

**Returns:** `{ combinations, matrix }` for story rendering

### withTailwindStyled

Storybook decorator that wraps stories with padding.

## Types

### ComponentConfig

```typescript
interface ComponentConfig {
  base?: string
  variants?: Record<string, Record<string, string>>
  defaultVariants?: Record<string, string>
  compoundVariants?: Array<{ class: string; [key: string]: any }>
}
```

## Migration from v4

No breaking changes. All APIs available in v4 remain functional in v5.

## License

MIT
