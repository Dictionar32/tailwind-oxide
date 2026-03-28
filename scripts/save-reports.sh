#!/bin/bash
# Save analysis reports to plans/ folder

set -e

strip_ansi() {
  sed -E 's/\x1B\[[0-9;]*[A-Za-z]//g; s/\\033\[[0-9;]*[A-Za-z]//g'
}

write_report() {
  local title="$1"
  local command="$2"
  local output_file="$3"

  echo "Saving ${title}..."
  {
    echo "# ${title}"
    echo ""
    echo "**Generated:** $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    echo '```text'
    bash -lc "$command" 2>&1 | strip_ansi
    echo '```'
  } > "$output_file"
}

mkdir -p plans

write_report "Zero-Everything Report - tailwind-styled-v4" "scripts/zero-everything-analyzer.sh" "plans/zero-everything-report.md"
write_report "Let Locations Report - tailwind-styled-v4" "scripts/show-let-locations.sh" "plans/let-locations-report.md"
write_report "Zero Let Remaining Report - tailwind-styled-v4" "scripts/zero-let-detailed.sh" "plans/zero-let-remaining.md"

echo "Reports saved to plans/"
ls -la plans/
