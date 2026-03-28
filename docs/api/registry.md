# Registry API — tw registry

`scripts/v45/registry.mjs` — Lightweight HTTP registry server untuk team/local publishing.

## CLI Usage

```bash
# Start server
tw registry serve [--port=4040] [--store=.tw-registry]
TW_REGISTRY_TOKEN=secret tw registry serve  # dengan auth

# List packages
tw registry list [--store=.tw-registry]

# Package info
tw registry info <package-name>
```

## HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/` | Registry info + package count |
| `GET`  | `/health` | `{ ok: true, packages: N }` |
| `GET`  | `/packages` | Array semua packages |
| `GET`  | `/packages/:name` | Metadata satu package |
| `POST` | `/packages` | Publish package (butuh token jika dikonfigurasi) |

## Publish via tw deploy

```bash
# Start registry dulu
tw registry serve --port=4040

# Publish dari project
tw deploy --registry=http://localhost:4040
tw deploy my-component --registry=http://localhost:4040 --version=1.2.0

# Dengan auth
TW_REGISTRY_TOKEN=secret tw deploy --registry=http://localhost:4040
```

## Auth

Set `TW_REGISTRY_TOKEN` di server dan gunakan header `Authorization: Bearer <token>` di client.  
`tw deploy` membaca token dari `TW_REGISTRY_TOKEN` env var secara otomatis.

## Store format

Setiap package disimpan sebagai `<name>.json` di direktori store:

```json
{
  "name": "my-button",
  "version": "1.0.0",
  "description": "...",
  "publishedAt": "2026-03-16T...",
  "id": "abc12345"
}
```

## Known limitations

- Tidak ada versioning per package (hanya menyimpan versi terakhir)
- Tidak ada tarball upload — hanya metadata
- Search melalui `tw plugin marketplace search` (Sprint 9)
- npm-compatible protocol (Sprint 10)
