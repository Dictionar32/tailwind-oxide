#!/bin/bash

count_hits() {
  local file="$1"
  if [ -s "$file" ]; then
    wc -l < "$file" | tr -d ' '
  else
    echo "0"
  fi
}

collect_code_only_lets() {
  find packages -path "*/src/*" -type f -name "*.ts" -not -path "*/node_modules/*" \
    -exec grep -HnE '^[[:space:]]*let([[:space:]]|$)' {} + 2>/dev/null \
    | sort || true
}

collect_raw_lets() {
  grep -rn "let " packages/ --include="*.ts" --exclude-dir=node_modules 2>/dev/null | sort || true
}

collect_code_only_lets_for_scope() {
  local scope="$1"
  if [ ! -d "$scope" ]; then
    return 0
  fi

  find "$scope" -path "*/src/*" -type f -name "*.ts" -not -path "*/node_modules/*" \
    -exec grep -HnE '^[[:space:]]*let([[:space:]]|$)' {} + 2>/dev/null \
    | sort || true
}

collect_raw_lets_for_scope() {
  local scope="$1"
  if [ ! -d "$scope" ]; then
    return 0
  fi

  grep -rn "let " "$scope" --include="*.ts" --exclude-dir=node_modules 2>/dev/null | sort || true
}

collect_raw_noise_examples() {
  local raw_file="$1"
  grep -vE '/src/.*:[0-9]+:[[:space:]]*let([[:space:]]|$)' "$raw_file" | head -n 10 || true
}
