# 中核 JS の仕様（format / availability / store / config）

PLAN.md の「データ」「空き判定」「Stripe 連携」を、関数の形まで決めたもの。テストはこの文書だけから書く。
すべて ES Modules（`export`）。DOM に触らない純粋な関数。時刻 `now` は必ず引数で受け取る（`Date` オブジェクト）。

## 共通の表し方
- 日付：`"YYYY-MM-DD"`（端末のローカル日付）。曜日は `new Date(y, m-1, d).getDay()`（0=日〜6=土）
- 時刻：開始時刻は整数の「時」（9 = 午前9時）。利用時間 `hours` は 2/3/4
- 枠の開始日時：ローカル時刻の `date` の `start` 時 0 分

## js/config.js
```js
export const CONFIG = {
  paymentLinks: { 2: "", 3: "", 4: "" }, // Stripe Payment Link。空ならデモ内のテスト決済画面
  hourlyRate: 3500,
  hoursOptions: [2, 3, 4],
  slotStarts: [9, 10, 11, 12, 13, 14, 15, 16], // 予約画面に並べる開始時刻
  pendingMinutes: 15,
  bookableDays: 14,  // 今日から何日分を選べるか
  storagePrefix: "kajiDemo.",
};
```

## js/format.js
| 関数 | 例 |
|---|---|
| `formatDate(iso)` | `"2026-10-24"` → `"10月24日（土）"`、`"2026-10-25"` → `"10月25日（日）"` |
| `dateParts(iso)` | `"2026-10-25"` → `{ month: 10, day: 25, dow: "日" }` |
| `formatHour(h)` | `9`→`"午前9時"`、`11`→`"午前11時"`、`12`→`"午後0時"`、`13`→`"午後1時"`、`16`→`"午後4時"` |
| `formatRange(start, hours)` | `(10, 2)` → `"午前10時〜午後0時"` |
| `formatYen(n)` | `7000` → `"7,000円"` |
| `yenParts(n)` | `7000` → `{ num: "7,000", unit: "円" }` |
| `toISODate(date)` | `Date` → `"YYYY-MM-DD"`（ローカル） |
| `addDays(iso, n)` | `("2026-10-31", 1)` → `"2026-11-01"` |

## js/availability.js
理由コード（画面の文言は UI 側で対応させる）：
`DAY_OFF`（勤務曜日外 or 休み設定）→「お休み」／`OUTSIDE_HOURS`（start < staff.start）→「お休み」／`INSUFFICIENT_TIME`（start+hours > staff.end）→「時間が足りません」／`BOOKED`→「予約済み」／`PAST`（枠の開始日時 ≤ now）→「受付終了」

判定の優先順：`PAST` → `DAY_OFF` → `OUTSIDE_HOURS` → `INSUFFICIENT_TIME` → `BOOKED`。

| 関数 | 内容 |
|---|---|
| `bookingState(b, now)` | `"paid"` / `"cancelled"` / `"pending"`（`expiresAt > now`）/ `"expired"`（pending で期限切れ） |
| `isBookingActive(b, now)` | `bookingState` が `paid` か `pending` |
| `overlaps(a, b)` | 同じ staffId・同じ date で `[start, start+hours)` が交わる |
| `slotStatus({ staff, date, start, hours, bookings, daysOff, now })` | `{ ok: true }` か `{ ok: false, reason }` |
| `openStarts({ staff, date, hours, bookings, daysOff, now, starts })` | ○ になる開始時刻の配列（`starts` は `CONFIG.slotStarts`） |
| `assignStaff({ staffList, date, start, hours, bookings, daysOff, now })` | その枠が ○ のスタッフのうち `staffList` の並び順で最初の1人の `id`。いなければ `null`（「どなたでもよい」用） |
| `slotStatusAny({ staffList, date, start, hours, bookings, daysOff, now })` | 誰か1人でも ○ なら `{ ok: true, staffId }`。全員 × なら、全員の理由に `BOOKED` があれば `BOOKED`、なければ優先順で最も前の理由 |
| `dayHasOpening({ staffList, date, hours, bookings, daysOff, now, starts })` | その日に誰か1人でも ○ の枠があるか（日付の横並び用） |
| `findConflicts(bookings, now)` | `paid` の予約で、他の有効な予約と重なるものの id の `Set`（管理画面の「重複」表示） |

## js/store.js
`createStore(storage, { now } = {})` — `storage` は `getItem/setItem/removeItem` を持つもの（ブラウザは `localStorage`、テストは Map を包んだ偽物）。`now` は `() => Date`（既定 `() => new Date()`）。キーは `kajiDemo.` + 名前。読めない JSON は初期シードで置き換える（例外を外に出さない）。

| メソッド | 内容 |
|---|---|
| `getStaff()` | 3名。`{ id, name, intro, skills[], workDays[], start, end }` |
| `getBookings()` | 予約の配列（date, start の昇順） |
| `addBooking({ staffId, date, start, hours, customer })` | `status: "pending"`、`amount = hours × hourlyRate`、`createdAt`、`expiresAt = createdAt + 15分`（ISO 文字列）、id は `A-MMDD-n`（MMDD は予約日、n はその日付で既存最大+1）。保存して返す |
| `markPaid(id, { sessionId } = {})` | `status: "paid"`、`paidAt`、`sessionId`（あれば）。期限切れ pending でも paid にする |
| `cancelBooking(id)` | `status: "cancelled"` |
| `getDaysOff()` / `toggleDayOff(staffId, date)` | `{ staffId, date }` の配列。トグルの後の状態（休みなら `true`）を返す |
| `getPrefs()` / `setPrefs(patch)` | `{ fontScale: "normal" | "large" }`、既定 `normal` |
| `getPendingId()` / `setPendingId(id)` / `clearPendingId()` | 決済待ちの予約 id |
| `reset()` | 全キーを消して初期シードを入れ直す（prefs は残す） |

初期シード（初回の読み込みと `reset()`）：今日を基準に相対で作る。
- スタッフ3名（架空）：`s1` 山本 さち子（月火水金、9〜17）、`s2` 小林 和美（火木土日、9〜15）、`s3` 森田 恵（月水木金土、10〜17）
- 予約：今日から1〜3日後に `paid` を4件以上（最初から × が混ざる）
- 休み：今日から2〜6日後に2件

## 画面の data 属性（Playwright の通しシナリオ用）
- `[data-step="1".."5"]`、完了 `[data-step="done"]`、中断 `[data-step="unpaid"]`、テスト決済 `[data-step="testpay"]`
- 担当行 `[data-staff="any"|"s1".."s3"]`、利用時間 `[data-hours="2"|"3"|"4"]`
- 日付 `[data-date="YYYY-MM-DD"][data-open="true|false"]`、時刻 `[data-slot="9".."16"][data-status="open|closed"][data-reason="BOOKED|…"]`
- トップ縮小表のセル `[data-mini-cell][data-staff][data-date]`（中に ○ の数）
- 管理画面の予約行 `[data-booking-id][data-state="paid|pending|expired|cancelled"]`、取り消し `[data-action="cancel"]`、休みトグル `[data-dayoff][data-staff][data-date]`、初期化 `[data-action="reset"]`
- 文字サイズ `[data-font-scale="normal|large"]`（`<html>` に `data-font-scale` を付ける）

## 補足（テスト作成時の解釈を正式化）
- `workDays` は `getDay()` の数値（0=日〜6=土）の配列
- 保存キー：`kajiDemo.staff` / `.bookings` / `.daysOff` / `.prefs` / `.pendingId`。すべて JSON で保存（pendingId も `JSON.stringify`）。未設定の `getPendingId()` は `null`
- `markPaid` / `cancelBooking` は更新後の予約を返す。存在しない id は `null` を返し、何も変えない
- `reset()` は prefs 以外の全キー（pendingId を含む）を消してシードし直す
- `findConflicts` は重なった paid 同士なら両方の id を含める
- シードの予約の `hours` は 2/3/4 のいずれか

## 補足2（レビュー指摘への対応。上の記述と食い違えばこちらが優先）
- 理由 `OUTSIDE_HOURS`：`start < staff.start` または `start >= staff.end`。`INSUFFICIENT_TIME` は勤務時間内に始まるが `start + hours > staff.end` の時だけ
- `slotStatusAny` で全員 × の時の理由：`BOOKED` が1人でもあれば `BOOKED`、次に `INSUFFICIENT_TIME` が1人でもあればそれ、それ以外は優先順で最も前。`staffList` が空なら `DAY_OFF`
- シード：予約は**担当の勤務曜日・勤務時間内**だけに置き、休み設定と重ならない。今日の曜日がどれでも、1〜3日後に `BOOKED` として見える予約が3件以上ある。休みは2〜6日後の**担当の勤務日**に2件
- 読めないキーは**そのキーだけ**を既定に戻す（staff → シードのスタッフ、bookings → シードの予約、daysOff → シードの休み、prefs → 既定、pendingId → null）。他のキーは書き換えない。配列の中の不正な要素（オブジェクトでない、id・date・start が無いなど）は読む時に捨てる
- 書込み（setItem / removeItem）の例外は外に出さない。store は値を内部にも持ち、書けなくてもそのページの間は動き続ける
- 予約 id の連番は、予約の `date` が同じものだけで数える（id の文字列ではなく `date` で絞る）
- `getPrefs()` の `fontScale` は `"normal" | "large"` 以外なら `"normal"`
