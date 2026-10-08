#!/usr/bin/env bash
# Generate Bridge Compliance Submission PDF from HTML.
#
# Recommended:
#   ./export-pdf.sh open
#   Then File -> Print -> Save as PDF
#
# Optional headless Chrome:
#   ./export-pdf.sh chrome

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HTML="$SCRIPT_DIR/Bridge-Compliance-Submission.html"
PDF="$SCRIPT_DIR/Bridge-Compliance-Submission.pdf"
FILE_URL="file://$HTML"

cmd="${1:-open}"

case "$cmd" in
  open)
    if command -v open >/dev/null 2>&1; then
      open "$HTML"
    else
      echo "Open manually: $FILE_URL"
    fi
    echo "Use Save as PDF from the page toolbar or browser print dialog."
    ;;
  chrome)
    CHROME=""
    for candidate in \
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
      "/Applications/Chromium.app/Contents/MacOS/Chromium"; do
      if [[ -x "$candidate" ]]; then
        CHROME="$candidate"
        break
      fi
    done
    if [[ -z "$CHROME" ]]; then
      echo "Chrome not found. Run: $0 open"
      exit 1
    fi
    "$CHROME" \
      --headless=new \
      --disable-gpu \
      --no-pdf-header-footer \
      --print-to-pdf="$PDF" \
      "$FILE_URL"
    echo "Wrote: $PDF"
    ;;
  *)
    echo "Usage: $0 [open|chrome]"
    exit 1
    ;;
esac
