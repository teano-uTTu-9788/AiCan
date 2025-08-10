#!/usr/bin/env bash
# Normalize audio file loudness to -16 LUFS and convert to AAC (.m4a)
# Usage: bash ffmpeg-normalize.sh input.wav output.m4a
set -e
INPUT="$1"
OUTPUT="$2"
if [ -z "$INPUT" ] || [ -z "$OUTPUT" ]; then
  echo "Usage: $0 input.wav output.m4a"
  exit 1
fi
# Normalize loudness and convert using ffmpeg
ffmpeg -i "$INPUT" -af loudnorm=I=-16:TP=-2:LRA=11 -ar 44100 -ac 2 -vn -c:a aac -b:a 128k "$OUTPUT"
