#!/bin/bash
# =============================================================
# Red Solidaria de Emergencias - instalador y lanzador (Mac)
# Uso:  bash iniciar.sh
# Hace todo: base de datos, backend, app Expo, y deja el QR
# en pantalla para escanear con el telefono.
# Es seguro ejecutarlo varias veces.
# =============================================================
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
SQL_CURSO="$DIR/../red_emergencias.sql"
BACKEND="$DIR/backend"
MOVIL="$DIR/mobile"
APP_EXPO="$DIR/red-emergencias-app"

rojo()  { printf "\033[31m%s\033[0m\n" "$1"; }
verde() { printf "\033[32m%s\033[0m\n" "$1"; }
azul()  { printf "\033[34m%s\033[0m\n" "$1"; }

# ---------- 1. Verificar herramientas ----------
azul "[1/7] Verificando herramientas..."
command -v node >/dev/null || { rojo "Falta Node.js. Instalar desde https://nodejs.org y volver a ejecutar."; exit 1; }
verde "  Node $(node -v) OK"

# Buscar cliente mysql (Workbench no siempre lo agrega al PATH)
MYSQL_BIN="$(command -v mysql || true)"
[ -z "$MYSQL_BIN" ] && [ -x /usr/local/mysql/bin/mysql ] && MYSQL_BIN=/usr/local/mysql/bin/mysql
[ -z "$MYSQL_BIN" ] && [ -x /opt/homebrew/bin/mysql ] && MYSQL_BIN=/opt/homebrew/bin/mysql

# ---------- 2. Credenciales MySQL ----------
azul "[2/7] Conexion a MySQL"
read -p "  Usuario MySQL [root]: " DB_USER
DB_USER=${DB_USER:-root}
read -s -p "  Contrasena MySQL (enter si no tiene): " DB_PASS
echo ""

# ---------- 3. Cargar la base de datos ----------
azul "[3/7] Cargando base de datos..."
if [ -n "$MYSQL_BIN" ]; then
  if [ -f "$SQL_CURSO" ]; then
    "$MYSQL_BIN" -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} < "$SQL_CURSO"
    verde "  red_emergencias.sql cargado"
  else
    rojo "  No encuentro $SQL_CURSO — cargalo manualmente en Workbench"; exit 1
  fi
  "$MYSQL_BIN" -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} red_emergencias -e \
    "ALTER TABLE usuario ADD COLUMN password_hash VARCHAR(100) NULL, ADD COLUMN avatar LONGTEXT NULL" 2>/dev/null \
    && verde "  Columnas password_hash y avatar agregadas" \
    || verde "  Columnas password_hash y avatar ya existian"
  # Coordenadas para el mapa y destino de donaciones (--force: ignora ALTER duplicado en re-ejecuciones)
  "$MYSQL_BIN" --force -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} < "$BACKEND/sql/02_mapa.sql" 2>/dev/null || true
  "$MYSQL_BIN" --force -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} < "$BACKEND/sql/03_destino.sql" 2>/dev/null || true
  "$MYSQL_BIN" --force -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} < "$BACKEND/sql/04_auditoria.sql" 2>/dev/null || true
  "$MYSQL_BIN" --force -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} < "$BACKEND/sql/05_sso.sql" 2>/dev/null || true
  "$MYSQL_BIN" --force -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} < "$BACKEND/sql/06_fondo.sql" 2>/dev/null || true
  verde "  Coordenadas y esquemas de destino cargados"
else
  rojo "  No encontre el cliente mysql en el PATH."
  echo "  Ejecuta en Workbench: red_emergencias.sql y backend/sql/01_auth.sql"
  read -p "  Cuando esten ejecutados, presiona Enter para continuar... " _
fi

# ---------- 4. Backend ----------
azul "[4/7] Preparando backend..."
cd "$BACKEND"
[ -d node_modules ] || npm install --silent
if [ ! -f .env ]; then
  SECRETO=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
  cat > .env << FIN
DB_HOST=localhost
DB_PORT=3306
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASS
DB_NAME=red_emergencias
JWT_SECRET=$SECRETO
PORT=3000
FIN
  verde "  .env creado con JWT_SECRET aleatorio"
fi
# Asegurar variable de SSO en instalaciones previas del .env
grep -q "GOOGLE_CLIENT_ID" .env || echo "GOOGLE_CLIENT_ID=" >> .env
npm run seed
verde "  Usuarios demo listos (clave: demo1234)"

# ---------- 5. Levantar la API ----------
azul "[5/7] Levantando la API..."
# Matar instancia previa si existe
lsof -ti tcp:3000 | xargs kill 2>/dev/null || true
sleep 1
nohup npm start > "$DIR/api.log" 2>&1 &
API_OK=0
for i in 1 2 3 4 5 6 7 8 9 10; do
  sleep 1
  if curl -s http://localhost:3000/api/salud | grep -q '"ok":true'; then API_OK=1; break; fi
done
if [ "$API_OK" = "1" ]; then
  verde "  API arriba en http://localhost:3000"
else
  rojo "  La API no respondio. Ultimas lineas del log:"
  tail -15 "$DIR/api.log"
  exit 1
fi

# ---------- 6. Configurar la app con la IP local ----------
azul "[6/7] Configurando la app movil..."
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
[ -z "$IP" ] && { rojo "  No detecte la IP wifi. Conectate a wifi y reintenta."; exit 1; }
sed -i '' "s|export const API_URL = .*|export const API_URL = \"http://$IP:3000\";|" "$MOVIL/src/api.js"
verde "  API_URL = http://$IP:3000"

if [ ! -d "$APP_EXPO" ]; then
  azul "  Creando proyecto Expo (primera vez, tarda unos minutos)..."
  npx --yes create-expo-app "$APP_EXPO" --template blank
fi
cp "$MOVIL/App.js" "$APP_EXPO/App.js"
rm -rf "$APP_EXPO/src"
cp -r "$MOVIL/src" "$APP_EXPO/src"
[ -f "$MOVIL/app.json" ] && cp "$MOVIL/app.json" "$APP_EXPO/app.json"
[ -f "$MOVIL/eas.json" ] && cp "$MOVIL/eas.json" "$APP_EXPO/eas.json"
verde "  Codigo y configuracion de la app copiados"

# Dependencias nativas (mapa, camara, QR) — expo install elige la version
# compatible con el SDK del proyecto. Rapido si ya estan instaladas.
cd "$APP_EXPO"
if [ ! -d node_modules/react-native-maps ] || [ ! -d node_modules/expo-camera ] || [ ! -d node_modules/react-native-qrcode-svg ] || [ ! -d node_modules/expo-linear-gradient ] || [ ! -d node_modules/expo-local-authentication ] || [ ! -d node_modules/expo-auth-session ] || [ ! -d node_modules/expo-image-picker ]; then
  azul "  Instalando dependencias nativas de la app..."
  npx expo install react-native-maps expo-camera react-native-svg @react-native-async-storage/async-storage expo-local-authentication expo-linear-gradient expo-auth-session expo-web-browser expo-crypto expo-image-picker
  npm install react-native-qrcode-svg --silent
fi
verde "  Dependencias de la app OK"

# ---------- 7. Abrir Expo ----------
azul "[7/7] Abriendo Expo. Escanea el QR con tu telefono (app Expo Go)."
echo ""
verde "Usuarios demo (clave demo1234):"
echo "  maria.f@mail.cl     (donante)"
echo "  carla.soto@mail.cl  (coordinadora)"
echo "  ana.morales@mail.cl (voluntaria)"
echo ""
cd "$APP_EXPO"
npx expo start
