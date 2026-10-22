# 中核 JS 再レビュー（2回目）の控え

確認スクリプトは scratchpad/r/t1〜t4.mjs（セッション限り）。node v24.12.0 で関数を直接呼んだ結果。

## 指摘
1. [中] store.js:51 VALID.staff が id しか見ない。staff=[{id:"s9"},...] → getStaff に残り、slotStatusAny/dayHasOpening が TypeError (workDays.includes)。staff=[1,2] や [] → スタッフ0人のまま再シードされない。
2. [中] store.js:68-75 書込み失敗が呼び手に分からない。容量超過で bookings だけ失敗、pendingId は成功 → 再読込（Stripe 帰り）で pendingId="A-1030-1"、予約は無い、markPaid → null。
3. [低〜中] store.js:58-61 + 補足2 の id 規則。2025-10-30 に A-1030-1 がある状態で 2026-10-30 に追加 → A-1030-1（重複）。markPaid("A-1030-1") は 2025 の予約を更新、新しい予約は pending のまま期限切れ。
4. [低] store.js:96,105-107 シードの返り値が SEED_STAFF そのもの。getStaff() の配列/要素を書き換えると別 store・reset 後のシードまで変わる（name CHANGED, zz 追加を確認）。zz を push すると workingSlots で workDays.includes が落ちる。
5. [低] store.js:86 unsaved を持つ間、そのキーは他タブの変更を読まない。後で書込みが通ると古い写しで上書き（B タブの取消と新規予約が消える）。
6. [低] 改ざん staff（id x1 のみ）+ bookings 破損 → シード予約の staffId s1/s2/s3 が staff に無い。

## 実データで合っていたこと
- シード: 今日=日〜土の7通り＋12/29, 12/31, 2/27(2027), 2/28(2028 閏), 10/31, 11/30 で、1〜3日後に5〜6件、全件が担当の slotStatus で BOOKED、重複0、findConflicts 0、id 重複0。年末は A-0101-1 等。
- 休み: 4〜6日後の勤務日に2件、各々 openStarts(2h) が 5〜7 → 0（○→× が出る）。予約と重ならない。日付またぎ（23:59:59→00:00:01）でも重ならない。
- 別キー破損: daysOff/prefs/staff 破損でも bookings 6件のまま。
- setItem/removeItem 常時例外: 追加・決済・休み・prefs・pendingId・reset すべて例外なしで、ページ内は値が反映。
- 配列内の null/数値/文字列/配列/id 無し/id 数値の要素は捨てる。非配列 JSON は再シード。
- 年違い同日 A-1030-3(2025) があっても 2026-10-30 は A-1030-1。
- slotStatusAny: BOOKED > INSUFFICIENT_TIME > 優先順、空は DAY_OFF。OUTSIDE_HOURS は start<start / start>=end。
- prefs 不正値（"huge", 配列, 文字列, null, 破損）→ normal。pendingId 非文字列 → null。
- reset 直後: 残るキーは prefs のみ。getBookings/getDaysOff/getStaff で書込み3回（各1回）、2回目以降は同じ値、予約 staffId は全て staff に存在、pendingId null、prefs large 維持。
