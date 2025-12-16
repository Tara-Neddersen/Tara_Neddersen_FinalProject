#!/bin/bash

SUBJECT=${1:-0051160}
FRACTIONAL_INTENSITY=${2:-0.5}

docker run --rm \
  --platform=linux/amd64 \
  -v "$(pwd)/data:/data:ro" \
  -v "$(pwd)/results:/results" \
  -v "$(pwd)/code:/app/code:ro" \
  -w /app \
  brain-extraction:v1.0 \
  --input /data \
  --output /results \
  --subject "$SUBJECT" \
  --fractional-intensity "$FRACTIONAL_INTENSITY"

