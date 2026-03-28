# Panduan Lengkap Mempublikasikan Paket NPM

Dokumen ini memberikan panduan langkah demi langkah untuk mempublikasikan paket NPM, dari persiapan awal hingga paket berhasil dipublikasikan dan dikelola.

---

## Daftar Isi

1. [Persiapan Awal](#1-persiapan-awal)
2. [Konfigurasi package.json](#2-konfigurasi-packagejson)
3. [Penamaan Paket](#3-penamaan-paket)
4. [File Pendukung](#4-file-pendukung)
5. [Perintah CLI untuk Login dan Publish](#5-perintah-cli-untuk-login-dan-publish)
6. [Semantic Versioning](#6-semantic-versioning)
7. [Menguji Paket Secara Lokal](#7-menguji-paket-secara-lokal)
8. [Memperbarui Paket yang Sudah Ada](#8-memperbarui-paket-yang-sudah-ada)
9. [Paket Public vs Private](#9-paket-public-vs-private)
10. [Integrasi dengan GitHub](#10-integrasi-dengan-github)
11. [Tips dan Kesalahan Umum](#11-tips-dan-kesalahan-umum)

---

## 1. Persiapan Awal

### 1.1 Instalasi Node.js dan npm

Pastikan Node.js terinstal di sistem Anda:

```bash
# Cek versi Node.js dan npm
node --version
npm --version
```

Disarankan menggunakan Node.js versi LTS (Long Term Support). Untuk proyek ini, diperlukan Node.js versi 20 atau lebih tinggi.

### 1.2 Membuat Akun NPM

1. Buka [npmjs.com/signup](https://www.npmjs.com/signup)
2. Isi formulir pendaftaran:
   - Username (akan menjadi scope untuk scoped packages)
   - Email (wajib diverifikasi)
   - Password (minimal 8 karakter)
3. Verifikasi email Anda
4. Untuk keamanan tambahan, aktifkan Two-Factor Authentication (2FA)

### 1.3 Login ke NPM

```bash
npm login
```

Anda akan diminta untuk memasukkan:
- Username
- Password
- Email
- OTP code (jika 2FA diaktifkan)

Verifikasi login berhasil:

```bash
npm whoami
```

---

## 2. Konfigurasi package.json

File `package.json` adalah konfigurasi utama paket NPM Anda. Berikut contoh lengkap berdasarkan best practices dari proyek ini:

```json
{
  "name": "@tailwind-styled/core",
  "version": "5.0.0",
  "description": "Zero-config, zero-runtime, compiler-driven Tailwind styling — tw.div, variants, RSC-aware",
  "type": "module",
  "sideEffects": false,
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "default": "./dist/index.js"
    },
    "./next": {
      "types": "./dist/next.d.ts",
      "import": "./dist/next.js",
      "require": "./dist/next.cjs"
    },
    "./vite": {
      "types": "./dist/vite.d.ts",
      "import": "./dist/vite.js",
      "require": "./dist/vite.cjs"
    }
  },
  "files": [
    "dist",
    "README.md",
    "CHANGELOG.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "clean": "rm -rf dist",
    "test": "npm run build && node --test test/*.test.mjs",
    "prepublishOnly": "npm run build"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/username/repo-name.git"
  },
  "keywords": [
    "tailwind",
    "css",
    "styling",
    "react",
    "compiler"
  ],
  "author": "Your Name <email@example.com>",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/username/repo-name/issues"
  },
  "homepage": "https://github.com/username/repo-name#readme",
  "engines": {
    "node": ">=20"
  },
  "dependencies": {
    "tailwind-merge": "^3",
    "postcss": "^8"
  },
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18"
  },
  "peerDependenciesOptional": {
    "tailwindcss": "^4"
  }
}
```

### Penjelasan Field Penting

| Field | Deskripsi | Contoh |
|-------|-----------|--------|
| `name` | Nama paket (unik di registry) | `@tailwind-styled/core` |
| `version` | Versi遵循 semantic versioning | `5.0.0` |
| `description` | Deskripsi singkat paket | — |
| `type` | Module type: `commonjs` atau `module` | `module` |
| `main` | Entry point untuk CommonJS | `./dist/index.cjs` |
| `module` | Entry point untuk ESM | `./dist/index.js` |
| `types` | TypeScript declarations | `./dist/index.d.ts` |
| `exports` | Kondisi export untuk berbagai import styles | lihat contoh |
| `files` | Whitelist file yang di-publish | `["dist", "README.md"]` |
| `sideEffects` | Apakah paket punya side effects | `false` |
| `engines` | Versi Node.js yang didukung | `{"node": ">=20"}` |
| `dependencies` | Runtime dependencies | — |
| `devDependencies` | Development dependencies | — |
| `peerDependencies` | Dependencies yang harus di-install pengguna | React, ReactDOM |
| `peerDependenciesOptional` | Optional peer dependencies | Tailwind CSS |

### Konfigurasi Advanced: Exports Field

Field `exports` mendukung berbagai kondisi import:

```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js",
    "require": "./dist/index.cjs",
    "default": "./dist/index.js"
  },
  "./package.json": "./package.json"
}
```

Ini memungkinkan pengguna mengimpor dengan:
```ts
import { tw } from 'package-name'        // ESM
const { tw } = require('package-name')   // CommonJS
```

---

## 3. Penamaan Paket

### 3.1 Aturan Dasar

- Nama harus lowercase
- Tidak boleh ada spasi, gunakan hyphen (`-`) atau underscore (`_`)
- Tidak boleh dimulai dengan titik (`.`) atau underscore (`_`)
- Tidak boleh menggunakan nama yang sudah terdaftar
- Maksimal 214 karakter

### 3.2 Scoped Packages

Untuk organisasi atau membuka banyak paket, gunakan scoped packages:

```json
{
  "name": "@nama-organisasi/nama-paket"
}
```

Contoh dari proyek ini:
- `@tailwind-styled/core`
- `@tailwind-styled/vite`
- `@tailwind-styled/next`
- `@tailwind-styled/cli`

### 3.3 Mengecek Ketersediaan Nama

```bash
# Cara 1: Cek online
# Kunjungi https://www.npmjs.com/package/[nama-paket]

# Cara 2: Gunakan npm search
npm search @tailwind-styled/core
```

---

## 4. File Pendukung

### 4.1 README.md

README adalah dokumen pertama yang dilihat pengguna. Berikut struktur yang direkomendasikan:

```markdown
# Nama Paket

Deskripsi singkat tentang paket ini.

## Instalasi

```bash
npm install nama-paket
# atau
yarn add nama-paket
```

## Penggunaan

Contoh penggunaan dasar:

```tsx
import { functionName } from 'nama-paket'

// Contoh kode
const result = functionName(input)
```

## API

### functionName(param)

Deskripsi fungsi.

**Parameters:**
- `param` (string): Deskripsi parameter

**Returns:**
- (string): Deskripsi return value

## Lisensi

MIT
```

### 4.2 CHANGELOG.md

Menjelaskan perubahan setiap versi:

```markdown
# Changelog

## [5.0.0] - 2024-01-15

### Added
- Fitur baru X
- Dukungan untuk Y

### Changed
- Perbaikan performa Z

### Fixed
- Bug pada fungsi A

### Breaking Changes
- Tidak ada lagi support untuk Node.js 14
```

### 4.3 LICENSE

File lisensi wajib untuk distribusi. Untuk open source, gunakan MIT, Apache 2.0, atau BSD.

Buat file `LICENSE` dengan teks lisensi yang sesuai.

### 4.4 .npmignore vs files Array

**Disarankan menggunakan `files` array di package.json** daripada `.npmignore`.

**files array (direkomendasikan):**
```json
"files": [
  "dist",
  "README.md",
  "CHANGELOG.md",
  "LICENSE"
]
```

Ini lebih aman karena tidak ada file yang ter-publish secara tidak sengaja.

**Beberapa file selalu di-exclude oleh npm:**
- `.git`
- `.gitignore`
- `node_modules`
- `package-lock.json`
- File yang dimulai dengan `.npmignore` patterns

---

## 5. Perintah CLI untuk Login dan Publish

### 5.1 Perintah Dasar

```bash
# Login ke NPM
npm login

# Cek siapa yang sedang login
npm whoami

# Logout
npm logout

# Dry run - simulasi publish tanpa benar-benar publish
npm publish --dry-run

# Publish paket
npm publish

# Publish scoped package sebagai public
npm publish --access public
```

### 5.2 Dist-tags

Tags memungkinkan distribusi berbeda:

```bash
# Publish ke tag beta
npm publish --tag beta

# Publish ke tag next (release candidate)
npm publish --tag next

# Lihat semua tag
npm dist-tag ls nama-paket

# Pindahkan tag ke versi lain
npm dist-tag add nama-paket@1.0.1 beta
```

### 5.3 Alur Publish Lengkap

```bash
# 1. Build paket
npm run build

# 2. Test secara lokal
npm run test

# 3. Cek apa yang akan di-publish
npm pack --dry-run

# 4. Login (jika belum)
npm login

# 5. Publish
npm publish --access public
```

---

## 6. Semantic Versioning

### 6.1 Format Versi

```
MAJOR.MINOR.PATCH
```

| Jenis | Kapan |
|-------|-------|
| **MAJOR** | Breaking changes (incompatible API) |
| **MINOR** | New features (backward compatible) |
| **PATCH** | Bug fixes (backward compatible) |

### 6.2 Perintah npm version

```bash
# Patch release: 1.0.0 -> 1.0.1
npm version patch

# Minor release: 1.0.1 -> 1.1.0
npm version minor

# Major release: 1.1.0 -> 2.0.0
npm version major

# Prerelease: 2.0.0 -> 2.0.0-beta.0
npm version prerelease --preid=beta

# Prerelease: 2.0.0-beta.0 -> 2.0.0-beta.1
npm version prerelease
```

`npm version` akan:
1. Mengupdate versi di `package.json`
2. Membuat git commit
3. Membuat git tag

### 6.3 Contoh Penggunaan

```bash
# Setelah fix bug
npm version patch
# 1.0.0 -> 1.0.1

# Setelah tambah fitur baru yang backward compatible
npm version minor
# 1.0.1 -> 1.1.0

# Setelah ada breaking change
npm version major
# 1.1.0 -> 2.0.0
```

### 6.4 Menentukan Jenis Update

| Skenario | Jenis Update |
|----------|--------------|
| Fix bug tanpa mengubah API | PATCH |
| Tambah fungsi baru | MINOR |
| Hapus atau ubah API | MAJOR |
| Update dokumentasi | PATCH |
| Refactor internal tanpa API change | PATCH |

---

## 7. Menguji Paket Secara Lokal

### 7.1 npm pack

Cek apa yang akan di-publish tanpa benar-benar mempublish:

```bash
# Dry run
npm pack --dry-run

# Generate file .tgz
npm pack
```

Output示例:
```
npm notice 📦  @tailwind-styled/core@5.0.0
npm notice === Tarball Contents ===
npm notice 1.2kB dist/index.js
npm notice 342B dist/index.d.ts
npm notice 1.1kB LICENSE
npm notice 3.4kB README.md
npm notice 782B package.json
npm notice === Tarball Details ===
npm notice name:          @tailwind-styled/core
npm notice version:       5.0.0
npm notice package size:  2.8 kB
npm notice unpacked size: 7.3 kB
npm notice total files:   5
```

### 7.2 npm link

Test paket di project lain secara lokal:

```bash
# Di direktori paket
cd /path/to/your-package
npm link

# Di project yang ingin diuji
cd /path/to/test-project
npm link your-package-name

# Verify
npm ls your-package-name

# Cleanup
npm unlink your-package-name
cd /path/to/your-package
npm unlink
```

### 7.3 Verifikasi TypeScript Types

```bash
# Build TypeScript
npm run build

# Cek TypeScript errors
npx tsc --noEmit
```

### 7.4 Test Installation

```bash
# Install dari .tgz file
npm install ./path-to/package.tgz
```

---

## 8. Memperbarui Paket yang Sudah Ada

### 8.1 Alur Update Standar

```bash
# 1. Buat perubahan kode
# 2. Update versi dengan npm version
npm version patch  # atau minor/major

# 3. Build ulang
npm run build

# 4. Test
npm run test

# 5. Publish
npm publish
```

### 8.2 Proses dengan Git dan GitHub

```bash
# Setelah npm version, Git sudah otomatis:
# - Mengupdate package.json
# - Membuat git commit
# - Membuat git tag

# Push dengan tags
git push origin main --tags

# Atau push manual
git push
git push --tags
```

### 8.3 Memperbarui Hanya dengan npm publish

```bash
# Edit version di package.json manual
# Atau:
npm version patch -m "Release: %s"

# Publish
npm publish
```

### 8.4 Unpublish (Jika Terjadi Kesalahan)

```bash
# Unpublish versi tertentu
npm unpublish nama-paket@1.0.0

# Unpublish seluruh paket (menghapus semua versi)
npm unpublish nama-paket --force
```

**Catatan:** Setiap versi yang di-unpublish tidak bisa dipublish ulang dengan nomor yang sama.

---

## 9. Paket Public vs Private

### 9.1 Perbedaan Dasar

| Aspek | Public | Private |
|-------|--------|---------|
| Akses | Semua orang bisa install | Hanya owner/collaborator |
| Biaya | Gratis | Berbayar (lihat pricing) |
| Nama | Bisa tidak scopes atau @scope | Wajib menggunakan scope |

### 9.2 Scoped Packages

Scoped packages adalah private secara default:

```bash
# Publish sebagai public
npm publish --access public

# Atau di package.json
{
  "publishConfig": {
    "access": "public"
  }
}
```

### 9.3 NPM Pricing (2024)

| Plan | Harga | Akses |
|------|-------|-------|
| Public | Gratis | Unlimited |
| Private (scoped) | $7/user/bulan | Limited |
| Organization | $7/user/bulan | Unlimited private packages |

### 9.4 Paket Sepenuhnya Private

```json
{
  "name": "@company/internal-package",
  "private": true
}
```

Paket dengan `"private": true` tidak akan pernah dipublish ke registry publik.

### 9.5 Cara Mengubah Akses

```bash
# Untuk scoped packages
npm access public nama-paket
# atau
npm access restricted nama-paket
```

---

## 10. Integrasi dengan GitHub

### 10.1 Setup Repository

Buat repository di GitHub dan hubungkan dengan lokal:

```bash
# Initialize git (jika belum)
git init

# Add remote
git remote add origin https://github.com/username/repo-name.git

# First commit
git add .
git commit -m "Initial commit"

# Push
git push -u origin main
```

### 10.2 Konfigurasi Repository di package.json

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/username/repo-name.git"
  },
  "bugs": {
    "url": "https://github.com/username/repo-name/issues"
  },
  "homepage": "https://github.com/username/repo-name#readme"
}
```

### 10.3 GitHub Actions untuk CI/CD Publish

Buat file `.github/workflows/publish.yml`:

```yaml
name: Publish to NPM

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write  # Required for trusted publishing
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Test
        run: npm test

      - name: Publish to NPM
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 10.4 Setup NPM Token untuk CI/CD

1. Buka [npmjs.com/access-tokens](https://www.npmjs.com/access-tokens)
2. Buat automation token
3. Di GitHub repository, buat secret:
   - Name: `NPM_TOKEN`
   - Value: token yang baru dibuat

### 10.5 Trusted Publishing (Recommended)

Trusted publishing menghilangkan kebutuhan token untuk CI/CD:

1. Di NPM: Settings > Publish > Add a registry publisher
2. Hubungkan dengan GitHub organization/repository
3. Di GitHub Actions, gunakan `id-token: write` permission

---

## 11. Tips dan Kesalahan Umum

### 11.1 Checklist Sebelum Publish

- [ ] `npm run build` berhasil tanpa error
- [ ] `npm run test` lulus semua test
- [ ] TypeScript compilation berhasil (`npx tsc --noEmit`)
- [ ] `npm pack --dry-run` menampilkan file yang expected
- [ ] Semua field di package.json terisi dengan benar
- [ ] README.md ada dan lengkap
- [ ] LICENSE file ada
- [ ] Version sesuai semantic versioning
- [ ] Hanya file yang diperlukan yang di-publish (cek `files` array)

### 11.2 Kesalahan Umum yang Harus Dihindari

#### ❌ Salah: Mempublish source code langsung
```json
// BAD
"main": "src/index.js"
```

✅ Benar:
```json
// GOOD
"main": "dist/index.js",
"files": ["dist"]
```

#### ❌ Salah: Tidak mendefinisikan engines
```json
// BAD - tidak ada batasan Node.js
```

✅ Benar:
```json
// GOOD
"engines": {
  "node": ">=18"
}
```

#### ❌ Salah: Memasang dependencies yang tidak perlu
```json
// BAD
"dependencies": {
  "typescript": "^5.0.0"  // Seharusnya devDependency
}
```

#### ❌ Salah: Tidak ada prepublish script
```json
// BAD
"scripts": {
  "test": "jest"
  // Tidak ada build step sebelum publish
}
```

✅ Benar:
```json
// GOOD
"scripts": {
  "build": "tsup",
  "prepublishOnly": "npm run build",
  "test": "jest"
}
```

#### ❌ Salah: Forgotten files array
Tanpa `files` array, semua file akan di-publish termasuk yang tidak perlu.

#### ❌ Salah: salah type field
```json
// BAD untuk ESM package
"type": "commonjs"

// GOOD
"type": "module"
```

### 11.3 Best Practices Tambahan

1. **Selalu gunakan prepublishOnly**
   ```json
   "scripts": {
     "prepublishOnly": "npm run build && npm test"
   }
   ```

2. **Gunakan exports field untuk multi-entry**
   ```json
   "exports": {
     ".": "./dist/index.js",
     "./plugin": "./dist/plugin.js"
   }
   ```

3. **Definisikan peerDependencies dengan benar**
   - dependencies: package yang diperlukan saat runtime
   - peerDependencies: package yang harus diinstall oleh consumer
   - devDependencies: hanya untuk development

4. **Gunakan sideEffects dengan tepat**
   ```json
   "sideEffects": false
   ```
   Ini memberitahu bundler bahwa semua exports bisa di-tree-shake.

5. **Selalu buat CHANGELOG**
   Agar pengguna bisa melihat setiap perubahan.

### 11.4 Troubleshooting

#### Error: Package name already exists
```bash
# Solusi: Gunakan nama berbeda atau scoped package
npm view nama-paket  # Cek apa yang ada
```

#### Error: You do not have permission to publish
```bash
# Untuk scoped packages, cek akses
npm access ls-packages @scope-name
```

#### Error: You must be logged in
```bash
# Login dulu
npm login
npm whoami  # Verifikasi
```

#### Error: You do not have permission to publish to the <registry>
- Cek apakah Anda sudah diundang sebagai collaborator
- Untuk organization, cek role Anda

---

## Referensi Cepat

### Perintah yang Sering Digunakan

```bash
# Setup
npm login
npm whoami
npm logout

# cek
npm search nama-paket
npm view nama-paket
npm view nama-paket version
npm dist-tag ls nama-paket

# Publish
npm publish
npm publish --access public
npm publish --tag beta

# Version
npm version patch
npm version minor
npm version major

# Test lokal
npm pack --dry-run
npm pack
npm link

# Update
npm dist-tag add nama-paket@version tag-name
npm unpublish nama-paket@version
```

---

## Sumber Daya Tambahan

- [Dokumentasi Resmi NPM](https://docs.npmjs.com)
- [Semantic Versioning](https://semver.org)
- [npm Blog - Best Practices](https://blog.npmjs.org)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

*Dokumen ini dibuat sebagai panduan komprehensif untuk mempublikasikan paket NPM. Untuk pertanyaan lebih lanjut, silakan查看 dokumentasi resmi atau buat issue di repository.*
