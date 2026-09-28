# Changelog

## 1.0.0 (2026-09-28)

Первый устанавливаемый выпуск: скилл только на чтение для счёта Bybit (UTA).

- Доступ: `session status` — ключ, права, режим счёта, связь, часы; ключ с правами
  на изменение отвергается.
- Счёт: `portfolio`, `balance` (торговый счёт, финансирование, Earn), `positions`.
- Опционы: `opt positions`, `opt greeks`, `opt margin` (Portfolio Margin),
  `opt chain` (по умолчанию ближайшая месячная), `opt expiries`.
- История: `trades`, `operations`, `pnl` (опционы глубже 6 месяцев — из журнала),
  `deliveries`; сбор по окнам с границей глубины биржи.
- Движение средств: `funds` — нетто-ввод с 2023-11-20, P2P и субсчёт, оценка по
  дневным свечам, абсолютный результат.
- Рынок: `quote`, `history` (D, W, M), `orderbook`, `instrument`, `search`; кэш
  справочника на сутки.
- Скилл: `SKILL.md`, `references/commands.md`, упаковка `bybit.skill`, `install.sh`.
- Бандл собирается с `--charset=utf8`: русский текст в `bybit.cjs` читаем.
