# Вывод команд: поля JSON и ловушки

Читай раздел команды ПЕРЕД тем, как разбирать её вывод. Здесь не описание всех
полей, а то, что влияет на корректность ответа: что расчётное, когда значение
пустое, какие единицы и знаки.

## Общие правила

- Сырые поля биржи — строки в том виде, как их отдал Bybit V5 (`"0.7749"`,
  `"1727222400000"`). Пустая строка `""` — биржа значение не прислала.
- Расчётное — только в `computed`, пояснение метода — в `computedNotes` с тем же
  ключом. В текстовом выводе расчётное помечено `[расчёт]`. `null` в `computed`
  — корректно вычислить нельзя, причина в `computedNotes`; не подменяй нулём и
  не считай приближение сам.
- `coverage` у исторических команд: по каждому источнику запрошенное начало
  (`requestedFrom`), фактическое (`from`), конец (`to`) и `boundary` — текст,
  если биржа не отдаёт данные так глубоко. Непустой `boundary` обязательно назови
  пользователю.
- Время — миллисекунды UTC (у `funds` в строках движения тоже мс). Даты
  ГГГГ-ММ-ДД рядом с ними и ISO-время у `launchTime`, `deliveryTime`,
  `nextFundingTime` в текстовом выводе — перевод формата, не расчёт.
- Проценты у Bybit — доли: IV `0.7749` = 77.49%, `price24hPcnt` `-0.0157` = −1.57%,
  `accountMMRate` `0.2513` = 25.13%.
- Все суммы в долларах — USD; USDT и USDC считаются равными доллару.

## Монеты Bybit

- **BBSOL** — токен стейкинга SOL на Bybit. Меняется на SOL через swap по курсу
  BBSOL/SOL; курс со временем растёт, в этом и доход. Это не SOL один к одному:
  стоимость BBSOL — количество × цена BBSOL, а не цена SOL.
- **BYUSDT** — не отдельная монета, а USDT, положенные в Earn: на счёте
  считаются как USDT, могут служить маржой, доход начисляется ежедневно.
- Признака «монета выпущена Bybit» в API нет — скилл такие монеты не помечает.
- Ставки доходности Earn скилл не показывает и они здесь не записаны: они
  меняются. Не называй ставку по памяти.

## `session status`

Сырое: `key` (маскированный ключ, `readOnly` — 1 значит только чтение,
`permissions` — разделы, `ips` — привязка к IP, `["*"]` — без привязки,
`expiredAt`), `account.unifiedMarginStatus`, `account.marginMode`,
`connectivity`.

Расчётное: `computed.clockDriftMs` — разница часов с биржей с поправкой на время
ответа; `null`, если биржа недоступна. `computed.isUnified` — счёт единый
торговый (UTA) по `unifiedMarginStatus`.

Ловушки: при `readOnly: 1` в `permissions` всё равно перечислены торговые разделы
— это разделы, доступные ключу НА ЧТЕНИЕ, торговать ключ не может. `problems` —
единственный список того, что не так; пустой — всё исправно.

## `portfolio`

Сырое: `account` (итоги `wallet-balance`: `totalEquity`, `totalMarginBalance`,
`totalAvailableBalance`, `totalInitialMargin`, `totalMaintenanceMargin`,
`accountIMRate`, `accountMMRate`, `totalPerpUPL`, `marginMode`), `coins` (по
монете: `equity`, `usdValue`, `unrealisedPnl`, `cumRealisedPnl`), `options`
(по базовой монете из `option-asset-info`: `totalUPL`, `totalRPL`,
`totalDelta`, `assetIM`, `assetMM`), `positionCounts`, `fundingTotalEquity`,
`earnTotalEquity`.

Расчётное:
- `totalValueUsd` — торговый счёт + кошелёк финансирования + Earn (итоги в USD от
  биржи). `null`, если биржа не вернула итог кошелька финансирования
  (`fundingTotalEquity: null`): монеты этого кошелька здесь не запрашиваются,
  поэтому пустой он или нет, неизвестно — фраза «хотя в нём есть монеты» в
  пояснении тут не проверена. Нет итога Earn — сумма без Earn, это сказано в
  пояснении.
- `unrealisedPnlTotal` — `totalPerpUPL` (бессрочные и фьючерсы) + сумма `totalUPL`
  по опционам. `totalPerpUPL` опционы НЕ включает. `null`, если чего-то нет.
- `coinShares` — доля `usdValue` монеты от суммы оценённых монет торгового счёта;
  монета в долге даёт отрицательную долю.
- `unvaluedCoins` — монеты, которые биржа не оценивает (не залог,
  `usdValue` = 0): их стоимость не показывается, а не выдаётся за 0.

Ловушки: `cumRealisedPnl` — накопленный результат за всё время в единицах монеты,
не USD; результат за период — `pnl`. В Portfolio Margin `totalMarginBalance` не
равен `totalWalletBalance + totalPerpUPL` из документации — показывай сырым, не
пересчитывай.

## `balance`

Сырое: `unified` (торговый счёт: `equity`, `walletBalance`, `locked` —
заблокировано в заявках, `borrowAmount` — долг, `usdValue`), `funding` (кошелёк
финансирования: `walletBalance`, `transferBalance` — доступно к переводу,
`totalEquity` — итог в USD от биржи), `earn` (`totalEquity`, по монетам
`equity` и `category`).

Расчётное:
- `fundingUsd` — оценка монеты кошелька финансирования: количество × `lastPrice`
  спотовой пары МОНЕТАUSDT. USDT и USDC = 1 (точно). Нет пары — `null` с причиной.
- `totalUsd` — сумма итогов трёх кошельков.
- `unvaluedCoins` — как в `portfolio`.

Ловушки: кошелёк финансирования маржой не служит. BYUSDT в Earn — это USDT.
Монета в долге (`borrowAmount` больше 0) даёт отрицательный `usdValue`.

## `positions`

Сырое: по позиции `category`, `symbol`, `side`, `size`, `avgPrice`, `markPrice`,
`positionValue`, `unrealisedPnl`, `leverage`, `liqPrice`, `positionIM`,
`positionMM`.

Расчётного нет. `fieldNotes` — причина по каждому полю, которое биржа оставила
пустым.

Ловушки: в Portfolio Margin биржа НЕ считает плечо, цену ликвидации и маржу
отдельной позиции — поля пустые, это не ошибка. Маржа по опционам — `opt margin`
(по монете). Пустая `liqPrice` вне PM — цена ликвидации вне диапазона цен.

## `opt positions`

Сырое: `symbol`, `side`, `size`, `avgPrice`, `markPrice`, `unrealisedPnl`,
`delta`, `gamma`, `vega`, `theta`, `deliveryTime` (из справочника, `""` — контракта
в справочнике нет).

Расчётное:
- `contract` — разбор символа: `baseCoin`, `expiryDate`, `strike`, `type`,
  `settleCoin`. Формат `BTC-27NOV26-104000-C-USDT`; без суффикса — USDC.
  `null` — символ не разобран.
- `daysToExpiry` — (`deliveryTime` − сейчас) в сутках, до 0.01.

Ловушки: греки — на ВСЮ позицию и уже со знаком стороны (проданный пут: дельта +,
гамма и вега −, тета +). Не умножай на размер и не меняй знак ещё раз. Единицы
веги и теты в документации Bybit не указаны: показывай сырыми, не переводи в
«$ за 1% IV» или «$ в день» по догадке. Время экспирации по символу не
определяется: крипта 08:00 UTC, акции (NVDA, SPCX) 20:00 UTC — бери `deliveryTime`.

## `opt greeks`

Сырое: по базовой монете `delta`, `gamma`, `vega`, `theta`; `notes` —
источники.

Расчётного нет: дельта — `totalDelta` из `option-asset-info` (только опционы,
без спота и бессрочных), гамма, вега, тета — из `coin-greeks`.

Ловушки: `coin-greeks` сам по себе даёт дельту ВМЕСТЕ со спотом и бессрочными;
скилл её сознательно не использует. Нетто-дельта всего портфеля с хеджем —
не эта команда. Единицы веги и теты — как в `opt positions`.

## `opt margin`

Сырое: `account` (`equity`, `marginBalance`, `accountIM`, `accountMM`,
`accountIMRate`, `accountMMRate`), по монете `assetIM`, `assetMM`,
`maxLossPriceMove` и `maxLossIvShock` (худший сценарий цены и IV),
`contingencyComponents`, `worstLoss` (`all`, `option`, `perpetual` — результат в
худшем сценарии), `options` (позиции монеты). `maxLossPriceMove` и
`maxLossIvShock` — доли: `-0.1` = цена −10%, `0.24` = IV +24%.

Знак: `worstLoss.*` и `optionLoss` — результат со знаком, как у биржи: минус —
потеря, плюс — выигрыш в этом сценарии. «Убыток» в названии не значит, что число
всегда отрицательное: опцион, который в худшем для монеты сценарии растёт, даёт
плюс — не называй его убытком.

Расчётное:
- `shareOfAccountMM` — `assetMM / accountMM`; `null`, если MM счёта ноль.
- `optionLoss` — убыток каждого опциона в худшем сценарии монеты. У опциона три
  значения на сценарий (IV вверх, без изменений, вниз); берётся по знаку
  `maxLossIvShock`. Сумма сверяется с итогом OPTION до 0.01; не сошлось — пусто с
  причиной.

Ловушки: маржа Portfolio Margin — по базовой монете, не по опциону. MM монеты =
худший убыток по сетке сценариев + contingency; IM = 1.2 × MM; MM счёта — сумма
по монетам. `optionLoss` — вклад опциона в риск, а не его маржа. Итога
PERPETUAL у монеты без бессрочных в ответе нет — `worstLoss.perpetual` пустой.
Счёт не в PM — `account: null`, `coins` пустой, в `notes` сказано, что маржа
считается по позициям (`positions`).

## `opt expiries`

Сырое: `baseCoin`, `deliveryTime`; `date` — ГГГГ-ММ-ДД из `deliveryTime`,
`calls` и `puts` — число контрактов (точный подсчёт, не `[расчёт]`).

Расчётное: `monthly` — месячная экспирация. Признака в API нет; правило —
последняя пятница месяца по дате UTC.

Ловушки: без монеты — все базовые монеты (список не зашит). Недельные доски
неполные: страйков меньше, чем в месячной.

## `opt chain`

Сырое: по контракту `symbol`, `optionsType`, `deliveryTime`, `bid1Price`,
`bid1Size`, `ask1Price`, `ask1Size`, `markPrice`, `bid1Iv`, `ask1Iv`, `markIv`,
`delta`, `gamma`, `vega`, `theta`, `volume24h`, `openInterest`,
`underlyingPrice`. `expiry` — выбранная дата, `availableExpiries` — все даты,
`notes` — как выбрана экспирация.

Расчётное: `strike` — разобран из символа, отдельного поля у биржи нет.

Ловушки: `bid1Price` или `ask1Price` `0` — заявки нет, а не нулевая цена; IV той
же стороны тогда тоже бессмысленна. IV — доли. Греки — на один контракт (в
отличие от `opt positions`). Без `--expiry` — ближайшая месячная; нет месячной —
ближайшая, это сказано в `notes`. Экспирация выбирается ДО фильтров: `expiry:
null` — на заданную дату (или вообще в будущем) контрактов нет; `expiry`
заполнен, а `rows` пуст — дата есть, но `--type` или диапазон страйков отсекли
всё.

## `trades`

Сырое: `category`, `symbol`, `side`, `execPrice`, `execQty`, `execValue`,
`execFee`, `feeCurrency`, `isMaker` (true — maker), `execType`, `execTime`; по
опционам `tradeIv` (IV сделки), `markIv`, `underlyingPrice` (цена базового
актива на момент сделки), `indexPrice`.

Расчётное: `feesByCurrency` — сумма `execFee` по валюте комиссии за период.

Ловушки: `execFee` плюс — уплачено, минус — ребейт. `execType` не только
`Trade`: `Delivery` — исполнение на экспирации, `BustTrade` — ликвидация и др.
Строки фандинга (`Funding`) из вывода убраны: это не сделки, и в
`feesByCurrency` их нет. Фандинг — `operations` (`feesFunding`) и `pnl`.
Глубина — 2 года, по умолчанию 30 дней.

## `operations`

Сырое: журнал `transaction-log` — `transactionTime`, `type` (TRADE, SETTLEMENT —
фандинг бессрочных, DELIVERY — расчёт экспирации, TRANSFER_IN, TRANSFER_OUT и
др.), `category`, `symbol`, `currency`, `side`, `qty`, `size` (позиция после
записи), `tradePrice`, `cashFlow`, `fee`, `funding`, `change`, `cashBalance`.

Расчётное:
- `totals` — суммы сырых полей по типу и валюте. `change = cashFlow + funding − fee`.
- `feesFunding` — сумма `fee` (плюс — расход, минус — возврат) и `funding` (плюс
  — получено, минус — уплачено) по валюте.

Ловушки: `fee` плюс — расход, в `change` он уже вычтен; не вычитай его
повторно. Итоги комиссий и фандинга здесь — те же, что справочно показывает
`pnl`.

## `pnl`

Сырое: `closedPerps` (`closed-pnl`: `closedPnl` уже за вычетом комиссий и
фандинга), `closedOptions` (`get-closed-positions`, в пределах 6 месяцев:
`totalPnl`, `deliveryPrice`, комиссии), `deliveries` (как в `deliveries`).

Расчётное:
- `optionPositions` — поле верхнего уровня, НЕ внутри `computed`, но целиком
  расчётное: позиции, восстановленные скиллом из журнала (заполнено только при
  `computed.optionsSource: journal`, иначе пустое). `result` — сумма `change`
  записей позиции; `null` с `reason`, если позиция открыта до начала журнала.
  В текстовом выводе помечено `[расчёт]`.
- `computed.optionsSource` — откуда результат опционов: `exchange` (период в
  пределах 6 месяцев) или `journal` (глубже: из журнала, сверено с биржей до
  цента).
- `currencies` — по валюте `closedPerps`, `closedOptions`, `total` =
  `closedPerps + closedOptions`; `funding` и `fees` — справочно, они уже внутри.
- `excluded` — сколько позиций не вошло в итог и почему.

Ловушки: итог НЕ включает спот (биржа не считает результат спотовых сделок);
полный результат со спотом — `funds`. Не прибавляй фандинг и комиссии к итогу
повторно. Опционы, истёкшие вне денег, записей в журнале не оставляют. Валюта
итога — USDT и USDC раздельно, не складывай их молча. 2 года — около 4 минут.

## `deliveries`

Сырое: `delivery-record` — `category`, `symbol`, `side`, `position`,
`entryPrice`, `strike`, `deliveryPrice` (цена расчёта), `fee`, `deliveryRpl`
(результат исполнения), `deliveryTime`.

Расчётного нет.

Ловушки: только исполненные в деньгах; опционы, истёкшие вне денег, биржа здесь
не показывает. Результат экспирации уже входит в `pnl`.

## `funds`

Сырое: `flows` (каждое движение: `kind`, `direction` — in или out, `coin`,
`amount`, `fee`, `status`, `time`, `counted` — учтено ли, `inProgress`),
`unclassified` (строки журнала финансирования незнакомого типа), `current`
(итоги кошельков в USD от биржи).

Расчётное:
- `flowsUsd` — оценка каждого движения в USD: USDT и USDC 1:1; прочие монеты — цена
  закрытия дневной спот-свечи МОНЕТАUSDT за день операции (UTC); за сегодня —
  последняя цена. Нет пары или свечи — `null` с причиной.
- `byKind` — итоги по виду движения.
- `depositedUsd`, `withdrawnUsd`, `netInputUsd` (введено − выведено),
  `currentValueUsd` (три кошелька), `resultUsd` (стоимость − нетто-ввод),
  `firstOperationTime`, `days` — срок.

Пустые значения:
- итоги (`depositedUsd`, `withdrawnUsd`, `netInputUsd`) — `null`, если хоть одно
  учтённое движение не оценено в USD или есть строка незнакомого типа
  (`unclassified`);
- незавершённое движение (`inProgress: true`) в итоги не входит, итоги при этом
  считаются, но `resultUsd` — `null` с причиной: деньги по нему могут быть уже
  списаны или зачислены;
- `currentValueUsd` — `null`, если биржа не вернула итог кошелька
  финансирования (как `totalValueUsd` в `portfolio`).

Ловушки: ввод и вывод — это вводы и выводы в блокчейн и между UID, P2P
покупки и продажи (по USDT 1:1, спред P2P не учтён) и переводы с субсчётом.
Переводы между своими кошельками, награды Earn, аирдропы — не ввод, они
попадают в результат. Займы (Crypto Loans) не учитываются. Начало —
2023-11-20. Оценка в USD — расчётная: погрешность — движение цены внутри дня.
Прогон около 2–3 минут.

## `quote`

Сырое: `quotes` — по каждому разделу, где есть тикер, поля `tickers` биржи
(`lastPrice`, `bid1Price`, `ask1Price`, `price24hPcnt`, `highPrice24h`,
`lowPrice24h`, `volume24h`, `turnover24h`; у бессрочных `markPrice`,
`fundingRate`, `nextFundingTime`, `openInterest`).

Расчётного нет.

Ловушки: `price24hPcnt` — доля. Тикер есть и на споте, и в бессрочных —
показаны оба, цены расходятся на доли процента. Цена монеты — спот.

## `history`

Сырое: `candles` — `start`, `open`, `high`, `low`, `close`, `volume`,
`turnover`.

Расчётного нет. `boundary` — текст, если свечи начинаются позже запрошенного
(биржа глубже не отдаёт); `lastCandleOpen` — последняя свеча не закрыта, её
`close` — текущая цена.

Ловушки: только D, W, M. Тикер и на споте, и в бессрочных — берётся спот;
бессрочный — `--category linear`. По опционам свечей нет.

## `orderbook`

Сырое: `bids`, `asks` — пары [цена, объём], лучшие первыми; `ts`.

Расчётного нет.

Ловушки: у опционов глубина не больше 25. Спот и бессрочный — по умолчанию
спот. Пустой стакан — заявок нет.

## `instrument`

Сырое: `cards` — карточка `instruments-info` по каждому разделу: `status`,
`priceFilter.tickSize`, `lotSizeFilter` (шаг и лимиты количества),
`leverageFilter`, `launchTime`, `deliveryTime` и др.

Расчётного нет.

Ловушки: `deliveryTime` `0` у бессрочных — даты поставки нет. Опционный
контракт находится по полному символу.

## `search`

Сырое: `matches` — `symbol`, `category`, `type` (спот, бессрочный, фьючерс,
инверсный), `baseCoin`, `quoteCoin`, `status`; `options` — базовые монеты с
опционами (одна строка на монету); `catalogSavedAt` — время кэша справочника.

Расчётного нет.

Ловушки: поиск только по тикеру — у Bybit нет названий монет, «bitcoin» ничего
не найдёт, ищи «BTC». Опционные контракты не перечисляются: даты — `opt
expiries`, доска — `opt chain`. Справочник спота и бессрочных кэшируется на
сутки в `~/.config/bybit/cache/`; опционы не кэшируются.
