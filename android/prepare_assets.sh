#!/usr/bin/env bash
# =====================================================================
# SUT Survey — prépare les assets des DEUX APK (méthode reprise du repo
# de référence : une app web par APK + supabase-config.js généré au build).
#   admin-app/ -> android/admin/src/main/assets/www
#   user-app/  -> android/user/src/main/assets/www
# La clé ANON est publique par design ; JAMAIS de service_role ici.
# =====================================================================
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
URL="${SUPABASE_URL:-https://cyvmkvhnympziikfiqca.supabase.co}"
ANON="${SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5dm1rdmhueW1wemlpa2ZpcWNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNDkxMTAsImV4cCI6MjEwODcyNTExMH0.Wob5fFO2ZR1Zz7NZpQfrwSl6Ryb-qkC5CNHbCzW-ucU}"

copy_app() { # $1=web dir  $2=android module
  SRC="$ROOT/$1"; DST="$ROOT/android/$2/src/main/assets/www"
  rm -rf "$DST"; mkdir -p "$DST"
  cp -r "$SRC/." "$DST/"
  rm -f "$DST/sw.js" "$DST/supabase-config.example.js" "$DST/robots.txt"
  printf 'window.__SUPABASE_URL = "%s";\nwindow.__SUPABASE_ANON = "%s";\n' "$URL" "$ANON" > "$DST/supabase-config.js"
  echo "$2: $(find "$DST" -type f | wc -l) fichiers, $(du -sh "$DST" | cut -f1)"
}
copy_app "admin-app" "admin"
copy_app "user-app"  "user"
