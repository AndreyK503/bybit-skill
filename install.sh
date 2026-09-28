#!/usr/bin/env bash
#
# Установщик скилла bybit (только чтение) для Linux, macOS и WSL:
#   curl -fsSL https://raw.githubusercontent.com/AndreyK503/bybit-skill/main/install.sh | bash
#
# Что делает:
#   1. Скачивает bybit.skill с GitHub (или берёт локальный: BYBIT_SKILL_FILE=<путь>).
#   2. Распаковывает в ~/.claude/skills/bybit (Claude Code) и ~/.agents/skills/bybit
#      (общий каталог агентов); старую версию удаляет.
#   3. Создаёт ~/.config/bybit/.env с пустыми строками ключа (права 600), если его
#      нет. Существующий файл не трогает: вписанный ключ остаётся.
set -euo pipefail

REPO="${BYBIT_REPO:-AndreyK503/bybit-skill}"
REF="${BYBIT_REF:-main}"
SKILL_NAME="bybit"
SKILL_URL="https://raw.githubusercontent.com/${REPO}/${REF}/${SKILL_NAME}.skill"
SKILL_DIRS=("$HOME/.claude/skills" "$HOME/.agents/skills")
CONFIG_DIR="$HOME/.config/bybit"
ENV_FILE="$CONFIG_DIR/.env"

info() { printf '%s\n' "$*"; }
die()  { printf 'Ошибка: %s\n' "$*" >&2; exit 1; }

command -v unzip >/dev/null 2>&1 || die "нужен unzip: установите его и повторите."

if ! command -v node >/dev/null 2>&1; then
  info "Внимание: Node.js не найден. Скилл будет установлен, но CLI не запустится без Node.js 20+ (nodejs.org, LTS)."
elif [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  info "Внимание: Node.js ниже 20. Скилл будет установлен, но для CLI обновите Node до 20+."
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
if [ -n "${BYBIT_SKILL_FILE:-}" ]; then
  [ -f "$BYBIT_SKILL_FILE" ] || die "локальный пакет не найден: $BYBIT_SKILL_FILE"
  cp "$BYBIT_SKILL_FILE" "$tmp/${SKILL_NAME}.skill"
  info "Локальный пакет: $BYBIT_SKILL_FILE"
else
  command -v curl >/dev/null 2>&1 || die "нужен curl."
  info "Скачиваю ${SKILL_NAME}.skill (${REF})..."
  curl -fsSL -o "$tmp/${SKILL_NAME}.skill" "$SKILL_URL" || die "не удалось скачать $SKILL_URL"
fi

for dir in "${SKILL_DIRS[@]}"; do
  mkdir -p "$dir"
  rm -rf "${dir:?}/${SKILL_NAME}"
  unzip -q "$tmp/${SKILL_NAME}.skill" -d "$dir"
  info "Установлено: ${dir}/${SKILL_NAME}"
done

mkdir -p "$CONFIG_DIR"
if [ -f "$ENV_FILE" ]; then
  info "${ENV_FILE} уже есть, не трогаю."
else
  (umask 077 && cat > "$ENV_FILE" <<'EOF'
# Ключ API Bybit только на чтение (Read-Only). Это секрет: в чат не отправлять.
# Создать: сайт Bybit -> управление API -> системный ключ, доступ Read-Only.
BYBIT_API_KEY=
BYBIT_API_SECRET=
EOF
  )
  chmod 600 "$ENV_FILE"
  info "Создан ${ENV_FILE}: впишите в него ключ и секрет."
fi

info ""
info "Готово. Дальше:"
info "  1) Впишите BYBIT_API_KEY и BYBIT_API_SECRET в ${ENV_FILE}."
info "  2) Перезапустите сессию агента: скилл ${SKILL_NAME} подхватится сам."
