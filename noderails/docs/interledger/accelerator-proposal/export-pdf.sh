#!/usr/bin/env bash
# Export NodeRails Open Payments Accelerator Proposal to PDF.
#
# Recommended (best diagram rendering):
#   ./export-pdf.sh open
#   Then in Chrome/Safari: File → Print → Save as PDF
#
# Alternative (text only, mermaid blocks as code):
#   ./export-pdf.sh md2pdf

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MD="$SCRIPT_DIR/NodeRails-Open-Payments-Accelerator-Proposal.md"
HTML="$SCRIPT_DIR/NodeRails-Open-Payments-Accelerator-Proposal.html"
PDF="$SCRIPT_DIR/NodeRails-Open-Payments-Accelerator-Proposal.pdf"

cmd="${1:-open}"

build_html() {
  node "$SCRIPT_DIR/build-html.js"
}

case "$cmd" in
  build)
    build_html
    ;;
  open)
    build_html
    if [[ ! -f "$HTML" ]]; then
      echo "Missing HTML: $HTML"
      exit 1
    fi
    echo "Opening print-ready HTML. Use File → Print → Save as PDF."
    if command -v open >/dev/null 2>&1; then
      open "$HTML"
    elif command -v xdg-open >/dev/null 2>&1; then
      xdg-open "$HTML"
    else
      echo "Open manually: file://$HTML"
    fi
    ;;
  md2pdf)
    if [[ ! -f "$MD" ]]; then
      echo "Missing markdown: $MD"
      exit 1
    fi
    echo "Note: first run may download Chromium and take several minutes."
    echo "For diagrams, prefer: $0 open"
    echo "Generating PDF via md-to-pdf (diagrams may appear as code blocks)..."
    npx --yes md-to-pdf "$MD"
    echo "Wrote: $PDF"
    ;;
  *)
    echo "Usage: $0 [build|open|md2pdf]"
    echo "  build   Regenerate HTML from markdown"
    echo "  open    Build HTML and open in browser for Save as PDF (recommended)"
    echo "  md2pdf  Generate PDF from markdown via npx md-to-pdf"
    exit 1
    ;;
esac
