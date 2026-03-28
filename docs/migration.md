# Migration Guide (v3 -> v4)

## Quick steps

1. Jalankan dry-run terlebih dulu:

```bash
npx tailwind-styled migrate ./src --dry-run
```

2. Jalankan migrasi nyata:

```bash
npx tailwind-styled migrate ./src
```

3. Untuk mode interaktif:

```bash
npx tailwind-styled migrate ./src --wizard
```

## Transform otomatis saat ini

- `tailwind-styled-components` -> `tailwind-styled-v4`
- `flex-grow` -> `grow`
- `flex-shrink` -> `shrink`
- Bootstrap `src/tailwind.css` (CSS-first) jika belum ada

## Catatan

Setelah migrasi, review manual tetap dibutuhkan untuk kelas/utility lain yang berubah di Tailwind v4.

## Tailwind v4 class renames yang di-handle `tw migrate`

| Lama (v3) | Baru (v4) |
|-----------|-----------|
| `flex-grow` | `grow` |
| `flex-shrink` | `shrink` |
| `overflow-ellipsis` | `text-ellipsis` |
| `decoration-slice` | `box-decoration-slice` |
| `decoration-clone` | `box-decoration-clone` |

## Migrasi dari Vue/Svelte ke Vue/Svelte adapter

Jika sebelumnya menggunakan class string manual:

```vue
<!-- Sebelum -->
<button :class="['px-4 py-2', intent === 'primary' ? 'bg-blue-500' : 'bg-red-500']">

<!-- Sesudah -->
<script setup>
import { cv } from "@tailwind-styled/vue"
const btn = cv({ base: "px-4 py-2", variants: { intent: { primary: "bg-blue-500", danger: "bg-red-500" } } })
const props = defineProps({ intent: { default: "primary" } })
</script>
<button :class="btn({ intent: props.intent })">
```

## Rollback

Jika perlu rollback setelah migrasi:
```bash
git diff src/          # review semua perubahan
git checkout src/      # rollback seluruh folder src
# atau per file:
git checkout src/components/Button.tsx
```
