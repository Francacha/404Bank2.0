#!/usr/bin/env bash
# Instala el backend de 404Bank en un EC2 con Ubuntu 24.04.
# Uso (en el servidor): bash instalar-ec2.sh <ip-publica>
# Antes hay que copiar el backend/.env al home del servidor (scp). Se puede volver a correr para actualizar.
set -euo pipefail

IP="${1:?Pasá la IP pública, por ejemplo: bash instalar-ec2.sh 18.231.180.126}"
DOMINIO="${IP//./-}.sslip.io"
REPO="https://github.com/Francacha/404Bank2.0.git"
RAMA="rama-franco"
DIR="$HOME/404Bank2.0"

echo "==> Paquetes del sistema"
sudo apt-get update -y
sudo apt-get install -y git curl ca-certificates gnupg debian-keyring debian-archive-keyring apt-transport-https

echo "==> Node.js 22"
if ! command -v node >/dev/null || [[ "$(node -v)" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
sudo npm install -g pm2

echo "==> Caddy (HTTPS automático)"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y caddy
fi

echo "==> Código ($RAMA)"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" fetch origin "$RAMA"
  git -C "$DIR" checkout "$RAMA"
  git -C "$DIR" reset --hard "origin/$RAMA"
else
  git clone --branch "$RAMA" "$REPO" "$DIR"
fi

echo "==> Variables de entorno"
if [ -f "$HOME/.env" ]; then mv "$HOME/.env" "$DIR/backend/.env"; fi
if [ ! -f "$DIR/backend/.env" ]; then
  echo "Falta el .env: copialo con scp al home del servidor y volvé a correr el script." >&2
  exit 1
fi
chmod 600 "$DIR/backend/.env"
# Valores que en el servidor siempre tienen que ser estos (pisa los que vengan del .env local).
fijar() {
  local clave="$1" valor="$2" archivo="$DIR/backend/.env"
  if grep -q "^${clave}=" "$archivo"; then sed -i "s|^${clave}=.*|${clave}=${valor}|" "$archivo"
  else printf '\n%s=%s\n' "$clave" "$valor" >> "$archivo"; fi
}
fijar NODE_ENV production
fijar PORT 3000
fijar BYPASS_CLERK_AUTH false
fijar CRONS_ACTIVOS true
grep -q '^FRONTEND_URL=' "$DIR/backend/.env" || fijar FRONTEND_URL http://localhost:5173

echo "==> Dependencias del backend"
cd "$DIR/backend"
npm ci --omit=dev

echo "==> Backend con pm2 (se reinicia solo si se cae o si se reinicia el servidor)"
pm2 delete 404bank >/dev/null 2>&1 || true
pm2 start index.js --name 404bank --time
pm2 save
sudo env PATH="$PATH" pm2 startup systemd -u "$USER" --hp "$HOME" >/dev/null

echo "==> Caddy para $DOMINIO"
sudo tee /etc/caddy/Caddyfile >/dev/null <<CADDY
$DOMINIO {
  reverse_proxy localhost:3000
}
CADDY
sudo systemctl restart caddy

echo "==> Probando"
sleep 6
curl -fsS http://localhost:3000/api/health && echo "  backend OK" || { echo "  El backend no responde. Mirá: pm2 logs 404bank --lines 50"; exit 1; }
for i in 1 2 3 4 5 6; do
  if curl -fsS "https://$DOMINIO/api/health" >/dev/null 2>&1; then echo "  HTTPS OK: https://$DOMINIO"; exit 0; fi
  sleep 5
done
echo "  HTTPS todavía no responde (el certificado puede tardar un minuto). Probá: curl https://$DOMINIO/api/health"
