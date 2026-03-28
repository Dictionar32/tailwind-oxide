#!/usr/bin/env bash
set -euo pipefail

echo "🎥 Generating v4.1 demo assets..."
mkdir -p docs/assets

if ! command -v terminalizer >/dev/null 2>&1; then
  echo "❌ terminalizer tidak ditemukan. Install dulu: npm install -g terminalizer"
  exit 1
fi

cat > demo-cli-config.yml << 'YAML'
command: bash
cwd: /workspace/tailwind-styled-v4.2
cols: 100
rows: 30
commands:
  - echo "🚀 tailwind-styled v4.1 Demo"
  - npm run health:summary
  - npm run validate:pr5:gaps
  - npm run bench:massive -- --root=test/fixtures/large-project
  - echo "✅ Demo complete"
YAML

echo "📟 Recording CLI demo..."
terminalizer record demo-cli.yml -c demo-cli-config.yml
terminalizer render demo-cli.yml -o docs/assets/demo-cli.gif

if command -v gifsicle >/dev/null 2>&1; then
  gifsicle -O3 docs/assets/demo-cli.gif -o docs/assets/demo-cli-optimized.gif
  echo "✅ Optimized GIF: docs/assets/demo-cli-optimized.gif"
else
  echo "⚠️ gifsicle tidak tersedia, skip optimasi GIF"
fi

echo "🖥️ Rekam UI demo secara manual dan simpan sebagai docs/assets/demo-ui.mp4"

if [[ -f docs/assets/demo-ui.mp4 ]]; then
  if command -v ffmpeg >/dev/null 2>&1; then
    ffmpeg -y -i docs/assets/demo-ui.mp4 -vf "fps=10,scale=800:-1" docs/assets/demo-ui.gif
    ffmpeg -y -i docs/assets/demo-cli.gif -i docs/assets/demo-ui.gif \
      -filter_complex "[0:v]scale=800:-1[cli];[1:v]scale=800:-1[ui];[cli][ui]vstack" \
      docs/assets/demo-full.mp4
    echo "✅ Generated docs/assets/demo-ui.gif and docs/assets/demo-full.mp4"
  else
    echo "⚠️ ffmpeg tidak tersedia, skip konversi UI/full video"
  fi
else
  echo "⚠️ docs/assets/demo-ui.mp4 belum ada, skip UI GIF dan full MP4"
fi

echo "✅ Done. Assets in docs/assets"
