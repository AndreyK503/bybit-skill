#!/usr/bin/env bash
#
# Установщик скилла bybit (только чтение) для Linux, macOS и WSL:
#   curl -fsSL https://raw.githubusercontent.com/AndreyK503/bybit-skill/main/install.sh | bash
#
# Что делает:
#   1. Спрашивает, куда ставить (BYBIT_SCOPE=global|project — без вопроса):
#        global  — ~/.claude/skills/bybit (Claude Code, все проекты) и
#                  ~/.agents/skills/bybit (общий каталог агентов); по умолчанию;
#        project — ./.claude/skills/bybit, только в текущем проекте.
#      Нет терминала для вопроса — global.
#   2. Скачивает bybit.skill с GitHub (или берёт локальный: BYBIT_SKILL_FILE=<путь>)
#      и распаковывает; старую версию удаляет.
#   3. Создаёт ~/.config/bybit/.env с пустыми строками ключа (права 600), если его
#      нет. Ключ всегда вне проекта; существующий файл не трогает.
set -euo pipefail

REPO="${BYBIT_REPO:-AndreyK503/bybit-skill}"
REF="${BYBIT_REF:-main}"
SKILL_NAME="bybit"
SKILL_URL="https://raw.githubusercontent.com/${REPO}/${REF}/${SKILL_NAME}.skill"
CONFIG_DIR="$HOME/.config/bybit"
ENV_FILE="$CONFIG_DIR/.env"
# Answer is read from the terminal, not stdin: under `curl | bash` stdin is the script.
TTY="${BYBIT_TTY:-/dev/tty}"

info() { printf '%s\n' "$*"; }
die()  { printf 'Ошибка: %s\n' "$*" >&2; exit 1; }

# Print global or project: BYBIT_SCOPE, else the user's answer, else global.
choose_scope() {
  if [ -n "${BYBIT_SCOPE:-}" ]; then printf '%s' "$BYBIT_SCOPE"; return; fi
  if ! { exec 3<"$TTY"; } 2>/dev/null; then printf 'global'; return; fi
  printf '%s\n' "Куда установить скилл?" \
    "  1) глобально — во всех проектах (~/.claude/skills) [по умолчанию]" \
    "  2) в текущий проект — только здесь ($PWD/.claude/skills)" >&2
  printf 'Выбор [1]: ' >&2
  local answer=""
  read -r answer <&3 || true
  case "$answer" in
    ""|1) printf 'global' ;;
    2) printf 'project' ;;
    *) printf '%s' "$answer" ;;
  esac
}

SCOPE="$(choose_scope)"
case "$SCOPE" in
  global)  SKILL_DIRS=("$HOME/.claude/skills" "$HOME/.agents/skills") ;;
  project) SKILL_DIRS=("$PWD/.claude/skills") ;;
  *) die "неизвестный выбор «$SCOPE»: ответьте 1 или 2, либо задайте BYBIT_SCOPE=global или BYBIT_SCOPE=project." ;;
esac

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
if [ "$SCOPE" = project ]; then
  info "  2) Запустите агента в этой папке ($PWD): скилл ${SKILL_NAME} виден только здесь."
  info "     Ключа в папке проекта нет, .claude/skills/${SKILL_NAME} можно хранить в git."
else
  info "  2) Перезапустите сессию агента: скилл ${SKILL_NAME} подхватится в любой папке."
fi
