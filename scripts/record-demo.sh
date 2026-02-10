#!/bin/bash

# Record a demo using Playwright codegen
# Usage: ./scripts/record-demo.sh [url]

URL="${1:-https://app.dash.builders/}"
OUTPUT_DIR="test/recordings"

mkdir -p "$OUTPUT_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="$OUTPUT_DIR/recording_$TIMESTAMP.spec.ts"

echo "Starting Playwright codegen..."
echo "URL: $URL"
echo "Output will be saved to: $OUTPUT_FILE"
echo ""
echo "Instructions:"
echo "  1. Interact with the browser to record your actions"
echo "  2. Close the browser when done"
echo "  3. Run: pnpm demo:translate $OUTPUT_FILE"
echo ""

pnpm exec playwright codegen "$URL" --output "$OUTPUT_FILE"

if [ -f "$OUTPUT_FILE" ]; then
  echo ""
  echo "Recording saved to: $OUTPUT_FILE"
  echo "To convert to a demo, run:"
  echo "  pnpm demo:translate $OUTPUT_FILE"
fi
