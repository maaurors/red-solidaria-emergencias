#!/usr/bin/env bash
# Busca texto en la coleccion de system prompts, o lista los archivos de un proveedor.
# Uso:
#   buscar.sh "texto" [Proveedor]
#   buscar.sh --listar [Proveedor]
set -euo pipefail

DESTINO="${SYSTEM_PROMPTS_DIR:-$HOME/.cache/system_prompts_leaks}"
if [ ! -d "$DESTINO" ]; then
  echo "No hay copia local. Ejecuta primero: bash $(dirname "$0")/obtener.sh" >&2
  exit 1
fi

if [ "${1:-}" = "--listar" ]; then
  # Rutas relativas para que se lean comodo; sin la carpeta .git.
  (cd "$DESTINO" && find "./${2:-}" -path ./.git -prune -o -type f \( -name "*.md" -o -name "*.txt" \) -print | sed 's|^\./||' | sort)
  exit 0
fi

PATRON="${1:?Indica el texto a buscar}"
CARPETA="$DESTINO/${2:-}"
# -r recursivo, -i sin distinguir mayusculas, -l solo nombres de archivo, con el conteo de coincidencias.
grep -ril --exclude-dir=.git -- "$PATRON" "$CARPETA" | while read -r f; do
  printf '%4d  %s\n' "$(grep -ic -- "$PATRON" "$f")" "${f#"$DESTINO"/}"
done | sort -rn | head -40
