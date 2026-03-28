# VSCode Extension API — @tailwind-styled/vscode

## Commands

### `tailwindStyled.analyzeWorkspace`
Scan seluruh workspace dan tampilkan ringkasan ke notification + detail JSON ke output channel.

Output: `Files • Unique classes • Occurrences • Top 3 classes`

### `tailwindStyled.installPlugin`
Input nama plugin → jalankan `npm install <plugin>` di workspace root.

### `tailwindStyled.createComponent`
QuickPick: **AI-generated** (via `tw ai`, butuh `ANTHROPIC_API_KEY`) atau **Snippet** (template tw() interaktif dengan tabstop).

### `tailwindStyled.splitRoutesCss`
Jalankan `scripts/v49/split-routes.mjs` pada workspace → tampilkan route CSS manifest di output channel.

Output: daftar `route → cssFile` + total classes per route.

### `tailwindStyled.figmaSync`
QuickPick: **Pull**, **Push**, atau **Diff** — delegasi ke `scripts/v45/figma-sync.mjs`.

Butuh `FIGMA_TOKEN` dan `FIGMA_FILE_KEY` di environment.

## Aktivasi

Extension aktif saat salah satu command dipanggil.

## Error handling

- Workspace belum dibuka → warning message
- AI generation gagal → fallback ke snippet otomatis  
- `FIGMA_TOKEN` tidak ada → error message dengan instruksi setup
- `split-routes` gagal → stderr ditampilkan di output channel

## Konfigurasi yang direncanakan

```json
{
  "tailwindStyled.lsp.enable": true,
  "tailwindStyled.ai.provider": "anthropic",
  "tailwindStyled.figma.fileKey": "abc123"
}
```

_(Settings dibaca via `vscode.workspace.getConfiguration("tailwindStyled")` — Sprint 6 done)_
