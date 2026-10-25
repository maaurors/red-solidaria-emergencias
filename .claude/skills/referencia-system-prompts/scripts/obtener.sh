#!/usr/bin/env bash
# Descarga (o actualiza) un clon superficial del repositorio de referencia en la cache del usuario.
# Se guarda fuera del proyecto para no mezclar 50 MB de archivos ajenos con el codigo.
set -euo pipefail

REPO_URL="https://github.com/asgeirtj/system_prompts_leaks.git"
DESTINO="${SYSTEM_PROMPTS_DIR:-$HOME/.cache/system_prompts_leaks}"

if [ -d "$DESTINO/.git" ]; then
  # Actualiza solo la ultima version de la rama principal.
  git -C "$DESTINO" fetch --depth 1 -q origin
  git -C "$DESTINO" reset --hard -q FETCH_HEAD
  echo "Actualizado: $DESTINO ($(git -C "$DESTINO" log -1 --format='%cd, %s' --date=short))"
else
  mkdir -p "$(dirname "$DESTINO")"
  git clone --depth 1 -q "$REPO_URL" "$DESTINO"
  echo "Descargado: $DESTINO ($(find "$DESTINO" -path "$DESTINO/.git" -prune -o -type f -print | wc -l) archivos)"
fi
