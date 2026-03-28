# tw transform — Known Limitations

## Overview
`tw transform <file> [out]` menggunakan Oxc transform jika tersedia, fallback ke Babel bila tidak.

## Limitations

### 1. JSX runtime harus tersedia
- **Status**: Requirement
- **Impact**: File `.tsx`/`.jsx` membutuhkan React atau JSX runtime di scope
- **Workaround**: Pastikan `react` atau `preact` terinstall di project

### 2. TypeScript generic di JSX bisa ambigu tanpa Oxc
- **Status**: Known issue di mode fallback Babel
- **Impact**: `<Component<T>>` dalam `.tsx` bisa salah parse menjadi comparison operator
- **Workaround**: Tambahkan trailing comma: `<Component<T,>>` atau gunakan Oxc
- **Target fix**: v4.6 Oxc-native transform

### 3. Class string yang dihasilkan kondisional tidak di-transform
- **Status**: By design (static transform only)
- **Impact**: `tw(condition && 'bg-red-500')` → class tidak di-hoist ke compile time
- **Workaround**: Pisahkan class statis dan dinamis:
  ```tsx
  // ❌ Tidak di-transform
  <div className={tw(condition && 'bg-red-500 text-white')} />
  
  // ✅ Didukung — statis dihoist, dinamis tetap runtime
  <div className={twMerge('text-white', condition && 'bg-red-500')} />
  ```

### 4. `hoist: true` (default) bisa mengubah semantik komponen class
- **Status**: Known behavioral change
- **Impact**: Class string dipindahkan keluar dari render function — bisa memengaruhi hot reload di beberapa setup Vite
- **Workaround**: Matikan hoist: `{ hoist: false }` di loader options
- **Solusi permanen**: HMR boundary detection sedang dikerjakan di v4.8

### 5. Source maps hanya tersedia dengan Oxc
- **Status**: Partial
- **Impact**: Mode fallback Babel tidak menghasilkan source maps yang akurat untuk class yang di-transform
- **Workaround**: Install `oxc-parser` dan `oxc-transform` untuk source map support penuh

### 6. File `.mdx` ✅ Sprint 9 done
- **Status**: Tidak diimplementasikan
- **Impact**: `tw transform page.mdx` akan melewati file tanpa transform
- **Workaround**: Pre-process MDX ke JSX terlebih dahulu
- **Target fix**: v4.5 — MDX adapter

## Pipeline Transform

```
Input file (.tsx/.jsx/.ts/.js)
    ↓
[Try Oxc transform] → ✅ Full AST, source maps, TypeScript
    ↓ (fallback jika Oxc tidak ada)
[Try Babel transform] → ⚠️ Slower, no source maps
    ↓ (fallback jika Babel tidak ada)
[Regex transform] → ⚠️ Very limited, may miss nested classes
    ↓
Output file (class names extracted + hoisted)
```

## Contoh Output

```json
{
  "file": "src/Button.tsx",
  "mode": "oxc-transform",
  "changed": true,
  "classes": ["px-4", "py-2", "bg-blue-500", "text-white", "rounded"],
  "rsc": { "isServer": false }
}
```

## Changelog
- v4.2: RSC (React Server Component) detection ditambahkan
- v4.1: Incremental transform cache diperkenalkan
- ✅ v4.6 done: Oxc-first pipeline dengan Babel + regex fallback (3-tier)
- ✅ v4.7 done: `tw split` untuk route-based CSS splitting
