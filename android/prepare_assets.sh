#!/usr/bin/env bash
# SUT Survey — copie l'app web dans les assets Android + génère supabase-config.js
# La clé ANON est publique par design. JAMAIS de service_role ici.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
URL="${SUPABASE_URL:-https://cyvmkvhnympziikfiqca.supabase.co}"
ANON="${SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5dm1rdmhueW1wemlpa2ZpcWNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNDkxMTAsImV4cCI6MjEwODcyNTExMH0.Wob5fFO2ZR1Zz7NZpQfrwSl6Ryb-qkC5CNHbCzW-ucU}"
SRC="$ROOT/web"
DST="$ROOT/android/site-survey/src/main/assets/www"
rm -rf "$DST"; mkdir -p "$DST"
cp -r "$SRC/." "$DST/"
# on retire le service worker du paquet local (inutile en file://)
rm -f "$DST/sw.js"
printf 'window.__SUPABASE_URL = "%s";\nwindow.__SUPABASE_ANON = "%s";\n' "$URL" "$ANON" > "$DST/supabase-config.js"
echo "assets OK : $(find "$DST" -type f | wc -l) fichiers, $(du -sh "$DST" | cut -f1)"
