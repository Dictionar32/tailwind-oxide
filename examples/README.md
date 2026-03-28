# Dokumentasi Contoh tailwind-styled-v4

Dokumentasi ini menjelaskan cara penggunaan package `tailwind-styled-v4` dan paket tambahannya melalui contoh-contoh yang tersedia.

## Daftar Isi

1. [Struktur Contoh](#struktur-contoh)
2. [tailwind-styled-v4 (Paket Inti)](#tailwind-styled-v4-paket-inti)
   - [Template Literals](#1-template-literals)
   - [Object Config dengan Variants](#2-object-config-dengan-variants)
   - [Fungsi cv() (Class Variant)](#3-fungsi-cv-class-variant)
   - [Fungsi cx() / cn() (Conditional Merge)](#4-fungsi-cx--cn-conditional-merge)
   - [extend() (Pewarisan Komponen)](#5-extend-pewarisan-komponen)
   - [tw.server (Komponen RSC)](#6-twserver-komponen-rsc)
   - [Live Token Engine](#7-live-token-engine)
   - [State Engine](#8-state-engine)
   - [Container Queries](#9-container-queries)
3. [@tailwind-styled/animate (Paket Animasi)](#tailwind-styledanimate-paket-animasi)
4. [@tailwind-styled/theme (Paket Tema)](#tailwind-styledtheme-paket-tema)
5. [Referensi Contoh](#referensi-contoh)

---

## Struktur Contoh

```
examples/
├── vite/                      # Dasar - template literal, variants, extend, cx
├── vite-react/               # React - responsive, animation, dark mode
├── standar-config-next-js-app/ # Next.js - semua komponen dengan cv(), tw.server
├── rspack/                   # rspack bundler
├── cli-demo/                 # Demo CLI
└── simple-app-html/          # HTML sederhana
```

---

## tailwind-styled-v4 (Paket Inti)

Paket inti yang menyediakan semua fungsi utama: `tw`, `cx`, `cn`, `server`, `styled`, `cv`, `liveToken`, `createStyledSystem`, dll.

### 1. Template Literals

Gunakan backticks untuk mendefinisikan class Tailwind secara langsung.

**Contoh (dari `vite/src/App.tsx`):**

```tsx
import { tw } from "tailwind-styled-v4"

// Komponen dasar dengan template literal
const Badge = tw.span`
  inline-flex items-center rounded-full px-2.5 py-0.5
  text-xs font-medium bg-blue-100 text-blue-800
`

const Card = tw.div`
  rounded-xl border border-gray-200 bg-white shadow-sm
  transition hover:shadow-md
`

// Penggunaan
function App() {
  return (
    <>
      <Badge>Label</Badge>
      <Card>Konten kartu</Card>
    </>
  )
}
```

**Catatan:** Template literals diproses pada saat build time, jadi tidak ada overhead runtime.

### 2. Object Config dengan Variants

Definisikan komponen dengan konfigurasi objek yang mendukung variants dan defaultVariants.

**Contoh (dari `vite/src/App.tsx`):**

```tsx
import { tw } from "tailwind-styled-v4"

const Button = tw.button({
  base: "inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  variants: {
    intent: {
      primary:   "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
      secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-400",
      danger:    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    },
    size: {
      sm: "text-sm px-3 py-1.5",
      md: "text-base px-4 py-2",
      lg: "text-lg px-6 py-3",
    },
  },
  defaultVariants: { intent: "primary", size: "md" },
})

// Penggunaan
function App() {
  return (
    <>
      <Button>Primary (default)</Button>
      <Button intent="secondary">Secondary</Button>
      <Button intent="danger" size="lg">Danger Large</Button>
    </>
  )
}
```

### 3. Fungsi cv() (Class Variant)

Fungsi `cv()` (class variant) adalah alternative untuk `tw()` dengan syntax yang lebih fleksibel untuk menangani compound variants.

**Contoh (dari `standar-config-next-js-app/src/components/Button.tsx`):**

```tsx
import { cv } from "tailwind-styled-v4"

const buttonVariants = cv({
  base: "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  variants: {
    variant: {
      default: "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500",
      outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-400",
      ghost:   "text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-400",
      danger:  "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
    },
    size: {
      sm: "h-8 px-3 text-xs",
      md: "h-9 px-4 text-sm",
      lg: "h-11 px-6 text-base",
    },
  },
  compoundVariants: [
    // Kombinasi khusus: outline + size lg = font lebih tebal
    { variant: "outline", size: "lg", class: "font-semibold" },
  ],
  defaultVariants: {
    variant: "default",
    size: "md",
  },
})

// Penggunaan pada komponen
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
  loading?: boolean
  children: React.ReactNode
}

export function Button({ variant, size, className, children, ...props }: ButtonProps) {
  return (
    <button className={buttonVariants({ variant, size, className })} {...props}>
      {children}
    </button>
  )
}

// Usage:
// <Button>Default</Button>
// <Button variant="outline" size="lg">Outline Large</Button>
// <Button variant="danger" loading>Deleting...</Button>
```

### 4. fungsi cx() / cn() (Conditional Merge)

Fungsi `cx()` (atau `cn()`) digunakan untuk menggabungkan class secara kondisional, mirip dengan `clsx` atau `tailwind-merge`.

**Contoh (dari `vite/src/App.tsx` dan `standar-config-next-js-app/src/components/Card.tsx`):**

```tsx
import { cx, cn } from "tailwind-styled-v4"

// cx() - conditional class merge
function StatusDot({ online }: { online: boolean }) {
  return (
    <span
      className={cx(
        "h-2.5 w-2.5 rounded-full",
        online ? "bg-green-500" : "bg-gray-300"
      )}
    />
  )
}

// cn() - sama seperti cx(), alias
function Card({ hoverable, className, children }: Props) {
  return (
    <article className={cn(
      "rounded-xl border border-gray-200 bg-white",
      hoverable && "hover:shadow-lg",
      className
    )}>
      {children}
    </article>
  )
}

// Dengan array
className={cx(["base-class", condition && "conditional-class"])}

// Dengan object
className={cx({
  "base-class": true,
  "active-class": isActive,
})}
```

### 5. extend() (Pewarisan Komponen)

Gunakan `.extend()` untuk membuat komponen turunan dengan class tambahan tanpa harus overwrite semuanya.

**Contoh (dari `vite/src/App.tsx`):**

```tsx
import { tw } from "tailwind-styled-v4"

// Komponen dasar
const Button = tw.button({
  base: "inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium",
  variants: {
    intent: {
      primary:   "bg-blue-600 text-white",
      secondary: "bg-gray-100 text-gray-900",
    },
  },
  defaultVariants: { intent: "primary" },
})

// Extend - tambahkan class baru tanpa kehilangan variants dari Button
const IconButton = Button.extend`
  aspect-square justify-center rounded-full p-2
`

// Usage
function App() {
  return (
    <>
      <Button intent="primary">Primary Button</Button>
      <IconButton intent="secondary" onClick={...}>+</IconButton>
      {/* IconButton masih punya akses ke props 'intent' dari Button */}
    </>
  )
}
```

**Selain itu, bisa juga menggunakan `tw(Component)` untuk extend:**

```tsx
// tw(Component) - extend komponen lain
const CardHoverable = tw(CardBase)`
  transition-all duration-200
  hover:-translate-y-1 hover:shadow-md hover:border-indigo-200
`

// Atau langsung dengan komponen React
const StyledComponent = tw(MyComponent)`
  additional classes here
`
```

### 6. tw.server (Komponen RSC)

Gunakan `tw.server` untuk komponen yang hanya berjalan di server (Next.js App Router / RSC). Ini 自动 mendeteksi boundary dan inject `use client` jika diperlukan.

**Contoh (dari `standar-config-next-js-app/src/app/page.tsx`):**

```tsx
import { tw, server } from "tailwind-styled-v4"

// Komponen server-only - akan dirender di server
const SectionTitle = server.h2`
  text-lg font-semibold text-gray-900 mb-4 pb-2
  border-b border-gray-100
`

// Jika komponen ini digunakan di client component,
// tailwind-styled-v4 akan自动 menambahkan 'use client'
// Usage:
// export default function Page() {
//   return <SectionTitle>Judul Section</SectionTitle>
// }
```

### 7. Live Token Engine

Fitur untuk dynamic theming dengan token yang dapat berubah pada runtime.

**Contoh penggunaan:**

```tsx
import { liveToken, setTokens, createUseTokens } from "tailwind-styled-v4"

// Membuat live token
const primaryColor = liveToken("blue-500")

// Mengatur nilai token
setTokens({
  colors: {
    primary: "blue-600",
  },
})

// Membuat hook untuk menggunakan tokens
const useTokens = createUseTokens({
  colors: {
    primary: "blue-500",
    secondary: "gray-500",
  },
})

// Dalam komponen
function Component() {
  const tokens = useTokens()
  return <div className={tokens.colors.primary}>Content</div>
}
```

### 8. State Engine

Mendefinisikan state-based styles yang responsif terhadap state komponen.

**Contoh:**

```tsx
import { tw } from "tailwind-styled-v4"

const Button = tw.button({
  base: "px-4 py-2 rounded-lg font-medium transition",
  state: {
    active: "bg-blue-600 text-white",
    hover: "bg-blue-700",
    disabled: "opacity-50 cursor-not-allowed",
  },
})

// State automatic diterapkan berdasarkan props/state
function App() {
  const [active, setActive] = useState(false)
  return (
    <Button className={active ? "active" : ""}>Click me</Button>
  )
}
```

### 9. Container Queries

Mendefinisikan styles berbasis container query.

**Contoh:**

```tsx
import { tw } from "tailwind-styled-v4"

const Card = tw.div({
  container: {
    md: "flex-row",
    lg: "grid-cols-2",
  },
})

// Atau dengan template literal
const ResponsiveCard = tw.div`
  container-[md]:flex-row
  container-[lg]:grid-cols-2
`
```

---

## @tailwind-styled/animate (Paket Animasi)

Paket untuk membuat dan mengelola animasi CSS.

### Inisialisasi

```tsx
import { initAnimate } from "@tailwind-styled/animate"

// Initialize native backend
initAnimate()
```

### API Utama

| Fungsi | Deskripsi |
|--------|-----------|
| `initAnimate()` | Inisialisasi native backend untuk animasi |
| `animate()` | Compile animation keyframes |
| `keyframes()` | Buat custom keyframes |
| `animations` | Preset animasi (fadeIn, slideUp, dll) |
| `injectAnimationCss()` | Inject CSS ke document |

### Contoh Penggunaan

```tsx
import { initAnimate, animate, keyframes, animations } from "@tailwind-styled/animate"

// Inisialisasi
initAnimate()

// Gunakan preset animations
const FadeInBox = tw.div`
  ${animations.fadeIn}
`

// Custom animation dengan animate()
const slideIn = animate({
  keyframes: keyframes`
    from { transform: translateX(-100%) }
    to { transform: translateX(0) }
  `,
  duration: "300ms",
  timingFunction: "ease-out",
})

// Inject CSS manually
injectAnimationCss()
```

### Preset Animations

Beberapa preset yang tersedia:
- `fadeIn` - Opacity fade in
- `fadeOut` - Opacity fade out
- `slideUp` - Slide from bottom
- `slideDown` - Slide from top
- `slideLeft` - Slide from right
- `slideRight` - Slide from left
- `scaleIn` - Scale up
- `scaleOut` - Scale down
- `shake` - Horizontal shake
- `spin` - Rotate animation

---

## @tailwind-styled/theme (Paket Tema)

Paket untuk manajemen theme dengan live tokens.

### API Utama

| Fungsi | Deskripsi |
|--------|-----------|
| `liveToken()` | Buat reactive token |
| `setToken()` | Set nilai token |
| `getToken()` | Ambil nilai token |
| `tokenRef` | Reference ke token |
| `tokenVar` | Variabel CSS token |

### Contoh Penggunaan

```tsx
import { 
  liveToken, 
  setToken, 
  getToken, 
  tokenRef, 
  tokenVar 
} from "@tailwind-styled/theme"

// Buat live token
const themeColor = liveToken("blue-500")

// Set theme
setToken("colors.primary", "blue-600")
setToken("colors.secondary", "gray-500")

// Ambil nilai
const primary = getToken("colors.primary")

// Gunakan dalam komponen
const ThemedComponent = tw.div`
  bg-[${tokenVar("colors.primary")}]
`

// Dengan tokenRef
const ref = tokenRef("colors.primary")
```

## Inject Config (tw setup)

CLI `tw setup` digunakan untuk melakukan inject konfigurasi yang diperlukan ke dalam project yang sudah ada. Command ini akan memodifikasi file-file konfigurasi agar project dapat menggunakan `tailwind-styled-v4` dengan optimal.

### Flags yang Tersedia

| Flag | Deskripsi |
|------|-----------|
| `--dry-run` | Preview perubahan tanpa mengaplikasikannya |
| `--skip-install` | Lewati proses instalasi package |
| `--yes` | Otomatis konfirmasi semua prompt |
| `--next` | Tipe project Next.js |
| `--vite` | Tipe project Vite |
| `--rspack` | Tipe project Rspack |
| `--react` | Tipe project React (standalone) |

### File yang Dimodifikasi

Berikut adalah file-file yang akan dipatch oleh `tw setup`:

1. **Konfigurasi Bundler**
   - `next.config.ts` - Untuk project Next.js
   - `vite.config.ts` - Untuk project Vite
   - `rspack.config.ts` - Untuk project Rspack

2. **Konfigurasi tailwind-styled**
   - `tailwind-styled.config.json` - Dibuat jika belum ada

3. **File CSS**
   - `globals.css` / `tailwind.css` - Menambahkan `@import "tailwindcss"`

4. **Konfigurasi TypeScript**
   - `tsconfig.json` - Menambahkan path aliases

### Proses Step-by-Step

Proses setup terdiri dari 5 langkah:

1. **Step 1/5 - Deteksi Project**: Mendeteksi tipe project (Next.js, Vite, Rspack, atau React)

2. **Step 2/5 - Konfigurasi Bundler**: Memodifikasi file konfigurasi bundler sesuai tipe project

3. **Step 3/5 - Setup CSS**: Menambahkan import Tailwind CSS ke file CSS utama

4. **Step 4/5 - Konfigurasi TS**: Menambahkan path aliases ke tsconfig.json

5. **Step 5/5 - Instalasi Package**: Menginstall package yang diperlukan ( kecuali `--skip-install`)

### Contoh Command

```bash
# Setup interaktif (akan meminta input)
npx tw setup

# Preview perubahan tanpa mengaplikasikan
npx tw setup --dry-run

# Setup otomatis tanpa konfirmasi untuk Next.js
npx tw setup --yes --next

# Setup untuk Vite tanpa instalasi package
npx tw setup --vite --skip-install

# Setup untuk Rspack dengan konfirmasi otomatis
npx tw setup --yes --rspack
```

---

## Referensi Contoh

### 1. Contoh Vite Dasar (`vite/src/App.tsx`)

Menunjukkan:
- Template literals dengan `tw.div`, `tw.span`, dll
- Object config dengan variants
- Pewarisan dengan `.extend()`
- Conditional merge dengan `cx()`

**Fitur yang ditunjukkan:**
```tsx
// Template literal
const Badge = tw.span`...`

// Object config + variants
const Button = tw.button({
  base: "...",
  variants: { ... },
  defaultVariants: { ... }
})

// Extend
const IconButton = Button.extend`...`

// cx() merge
cx("base-class", condition && "conditional")
```

### 2. Contoh Vite React (`vite-react/src/App.tsx`)

Menunjukkan:
- Responsive layout dengan Tailwind breakpoints
- Animation dengan Tailwind animate classes
- Dark mode toggle
- Component composition

**Fitur yang ditunjukkan:**
```tsx
// Responsive: sm:, md:, lg:
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"

// Dark mode
className="text-gray-900 dark:text-white"

// Hover states
className="hover:-translate-y-1 hover:shadow-lg"

// Transition
className="transition-all duration-200"
```

### 3. Contoh Next.js Standar (`standar-config-next-js-app/`)

Menunjukkan:
- Semua komponen dengan `cv()` variants + compoundVariants
- Komponen RSC dengan `tw.server`
- Komposisi komponen dengan `tw(Component)` extend
- Pattern komponen lengkap (Button, Card, Badge, Alert, Avatar, Input)

**Fitur yang ditunjukkan:**
```tsx
// cv() dengan compoundVariants
const buttonVariants = cv({
  base: "...",
  variants: { variant, size },
  compoundVariants: [
    { variant: "outline", size: "lg", class: "font-semibold" }
  ],
  defaultVariants: { ... }
})

// tw.server untuk RSC
const SectionTitle = server.h2`...`

// tw(Component) extend
const CardHoverable = tw(CardBase)`...`

// cn() conditional merge
className={cn(baseClass, condition && "conditional")}
```

---

## Tips Penggunaan

1. **Gunakan template literals** untuk komponen statis yang tidak perlu variants - lebih mudah dibaca dan performant.

2. **Gunakan object config** ketika butuh variants, defaultVariants, atau conditional variants.

3. **Gunakan cv()** ketika butuh compoundVariants yang kompleks.

4. **Gunakan cx()/cn()** untuk conditional classes di luar definisi komponen.

5. **Gunakan .extend()** untuk membuat komponen turunan tanpa kehilangan variants asli.

6. **Gunakan tw.server** untuk komponen yang hanya dijalankan di server (Next.js App Router).

7. **Gunakan liveToken** untuk theming dinamis yang butuh perubahan runtime.

---

## Lihat Juga

- [Dokumentasi Utama](../../README.md)
- [Configuration](./tailwind-styled.config.json)
- [ Contoh Lengkap](./standar-config-next-js-app/)