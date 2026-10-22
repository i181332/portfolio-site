// 仕様: docs/spec-core.md「js/availability.js」、PLAN.md「空き判定」
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bookingState, isBookingActive, overlaps, slotStatus, openStarts,
  assignStaff, slotStatusAny, dayHasOpening, findConflicts,
} from "../../js/availability.js";

// 仕様の解釈: workDays は getDay() の値（0=日〜6=土）の配列として扱う。
const S1 = { id: "s1", name: "山本 さち子", workDays: [1, 2, 3, 5], start: 9, end: 17 };  // 月火水金
const S2 = { id: "s2", name: "小林 和美", workDays: [2, 4, 6, 0], start: 9, end: 15 };    // 火木土日
const S3 = { id: "s3", name: "森田 恵", workDays: [1, 3, 4, 5, 6], start: 10, end: 17 };  // 月水木金土
const STAFF = [S1, S2, S3];

// 2026-10-24 は土曜。25=日 26=月 27=火
const NOW = new Date(2026, 9, 24, 8, 0);
const SAT = "2026-10-24", SUN = "2026-10-25", MON = "2026-10-26";

const iso = (d) => d.toISOString();
const min = (m) => new Date(NOW.getTime() + m * 60000);
const paid = (id, staffId, date, start, hours) => ({ id, staffId, date, start, hours, status: "paid" });
const pending = (id, staffId, date, start, hours, expiresAt) =>
  ({ id, staffId, date, start, hours, status: "pending", expiresAt: iso(expiresAt) });
const cancelled = (id, staffId, date, start, hours) => ({ id, staffId, date, start, hours, status: "cancelled" });

const slot = (o) => slotStatus({ staff: S1, date: MON, start: 9, hours: 2, bookings: [], daysOff: [], now: NOW, ...o });

// ---- bookingState / isBookingActive ----
test("bookingState: paid / cancelled はそのまま", () => {
  assert.equal(bookingState(paid("a", "s1", MON, 9, 2), NOW), "paid");
  assert.equal(bookingState(cancelled("a", "s1", MON, 9, 2), NOW), "cancelled");
});

test("bookingState: pending は expiresAt > now で pending、境界・過去は expired", () => {
  assert.equal(bookingState(pending("a", "s1", MON, 9, 2, min(1)), NOW), "pending");
  assert.equal(bookingState(pending("a", "s1", MON, 9, 2, min(0)), NOW), "expired");
  assert.equal(bookingState(pending("a", "s1", MON, 9, 2, min(-1)), NOW), "expired");
});

test("bookingState: 期限切れでも paid になった予約は paid", () => {
  const b = { ...pending("a", "s1", MON, 9, 2, min(-30)), status: "paid" };
  assert.equal(bookingState(b, NOW), "paid");
});

test("isBookingActive: paid と期限内 pending だけ true", () => {
  assert.equal(isBookingActive(paid("a", "s1", MON, 9, 2), NOW), true);
  assert.equal(isBookingActive(pending("a", "s1", MON, 9, 2, min(15)), NOW), true);
  assert.equal(isBookingActive(pending("a", "s1", MON, 9, 2, min(-1)), NOW), false);
  assert.equal(isBookingActive(cancelled("a", "s1", MON, 9, 2), NOW), false);
});

// ---- overlaps ----
test("overlaps: 部分重なり・包含・同一は true", () => {
  const a = paid("a", "s1", MON, 10, 2); // [10,12)
  assert.equal(overlaps(a, paid("b", "s1", MON, 11, 2)), true);
  assert.equal(overlaps(a, paid("b", "s1", MON, 9, 2)), true);
  assert.equal(overlaps(a, paid("b", "s1", MON, 10, 4)), true);
  assert.equal(overlaps(a, paid("b", "s1", MON, 10, 2)), true);
  assert.equal(overlaps(paid("b", "s1", MON, 9, 4), a), true);
});

test("overlaps: 隣接（終わり＝始まり）は重ならない（両方向）", () => {
  const a = paid("a", "s1", MON, 10, 2); // [10,12)
  assert.equal(overlaps(a, paid("b", "s1", MON, 12, 2)), false);
  assert.equal(overlaps(paid("b", "s1", MON, 12, 2), a), false);
  assert.equal(overlaps(a, paid("b", "s1", MON, 8, 2)), false);
});

test("overlaps: 別スタッフ・別日は false", () => {
  const a = paid("a", "s1", MON, 10, 2);
  assert.equal(overlaps(a, paid("b", "s2", MON, 10, 2)), false);
  assert.equal(overlaps(a, paid("b", "s1", "2026-10-27", 10, 2)), false);
});

// ---- slotStatus: 理由コード ----
test("slotStatus: 空いていれば { ok: true }", () => {
  assert.deepEqual(slot({}), { ok: true });
});

test("DAY_OFF: 勤務曜日外（s1 は日曜休み）", () => {
  assert.deepEqual(slot({ date: SUN }), { ok: false, reason: "DAY_OFF" });
});

test("DAY_OFF: 休み設定（同じスタッフ・同じ日）", () => {
  const daysOff = [{ staffId: "s1", date: MON }];
  assert.deepEqual(slot({ daysOff }), { ok: false, reason: "DAY_OFF" });
});

test("DAY_OFF: 他スタッフ・他日の休みは影響しない", () => {
  assert.deepEqual(slot({ daysOff: [{ staffId: "s2", date: MON }, { staffId: "s1", date: "2026-10-27" }] }), { ok: true });
});

test("OUTSIDE_HOURS: start < staff.start（s3 は 10 時から）", () => {
  assert.deepEqual(slot({ staff: S3, start: 9 }), { ok: false, reason: "OUTSIDE_HOURS" });
  assert.deepEqual(slot({ staff: S3, start: 10 }), { ok: true }); // ちょうど
});

test("INSUFFICIENT_TIME: start+hours > staff.end、ちょうど end は ○", () => {
  assert.deepEqual(slot({ start: 15, hours: 2 }), { ok: true });                       // 17 = end
  assert.deepEqual(slot({ start: 16, hours: 2 }), { ok: false, reason: "INSUFFICIENT_TIME" }); // 18 > 17
  assert.deepEqual(slot({ start: 13, hours: 4 }), { ok: true });                       // 17 = end
  assert.deepEqual(slot({ start: 14, hours: 4 }), { ok: false, reason: "INSUFFICIENT_TIME" });
  assert.deepEqual(slot({ staff: S2, date: SUN, start: 13, hours: 2 }), { ok: true });  // 15 = end
  assert.deepEqual(slot({ staff: S2, date: SUN, start: 14, hours: 2 }), { ok: false, reason: "INSUFFICIENT_TIME" });
});

test("BOOKED: 有効な paid と重なる", () => {
  const bookings = [paid("a", "s1", MON, 10, 2)]; // [10,12)
  assert.deepEqual(slot({ bookings, start: 9, hours: 2 }), { ok: false, reason: "BOOKED" });  // 1時間重なる
  assert.deepEqual(slot({ bookings, start: 10, hours: 2 }), { ok: false, reason: "BOOKED" });
  assert.deepEqual(slot({ bookings, start: 11, hours: 2 }), { ok: false, reason: "BOOKED" });
});

test("BOOKED 境界: 隣接する予約は重ならず ○（1つ手前・ちょうど・1つ先）", () => {
  const bookings = [paid("a", "s1", MON, 10, 2)]; // [10,12)
  assert.deepEqual(slot({ bookings, start: 9, hours: 2 }), { ok: false, reason: "BOOKED" }); // 11 > 10
  assert.deepEqual(slot({ bookings, start: 12, hours: 2 }), { ok: true });  // 始まり＝終わり
  assert.deepEqual(slot({ bookings, start: 13, hours: 2 }), { ok: true });
  const after = [paid("a", "s1", MON, 12, 2)];
  assert.deepEqual(slot({ bookings: after, start: 10, hours: 2 }), { ok: true }); // 終わり＝始まり
  assert.deepEqual(slot({ bookings: after, start: 10, hours: 3 }), { ok: false, reason: "BOOKED" });
});

test("BOOKED: 別スタッフ・別日の予約は無関係", () => {
  const bookings = [paid("a", "s2", MON, 10, 2), paid("b", "s1", "2026-10-27", 10, 2)];
  assert.deepEqual(slot({ bookings, start: 10 }), { ok: true });
});

test("pending: 期限内は ×、期限切れは ○", () => {
  const live = [pending("a", "s1", MON, 10, 2, min(15))];
  const dead = [pending("a", "s1", MON, 10, 2, min(-1))];
  assert.deepEqual(slot({ bookings: live, start: 10 }), { ok: false, reason: "BOOKED" });
  assert.deepEqual(slot({ bookings: dead, start: 10 }), { ok: true });
});

test("pending 期限の境界: expiresAt = now は期限切れ（○）、1分先は ×", () => {
  assert.deepEqual(slot({ bookings: [pending("a", "s1", MON, 10, 2, min(0))], start: 10 }), { ok: true });
  assert.deepEqual(slot({ bookings: [pending("a", "s1", MON, 10, 2, min(1))], start: 10 }), { ok: false, reason: "BOOKED" });
});

test("cancelled の予約は ○", () => {
  assert.deepEqual(slot({ bookings: [cancelled("a", "s1", MON, 10, 2)], start: 10 }), { ok: true });
});

test("PAST: 今日の枠の開始日時 ≤ now（ちょうどは PAST、1時間先は ○）", () => {
  const now = new Date(2026, 9, 24, 10, 0); // 土 10:00 / s2 は土に勤務
  const args = { staff: S2, date: SAT, hours: 2, now };
  assert.deepEqual(slot({ ...args, start: 9 }), { ok: false, reason: "PAST" });
  assert.deepEqual(slot({ ...args, start: 10 }), { ok: false, reason: "PAST" }); // ちょうど
  assert.deepEqual(slot({ ...args, start: 11 }), { ok: true });
});

test("PAST: 10:01 なら 10 時の枠も PAST、9:59 なら ○、昨日以前は PAST", () => {
  assert.deepEqual(slot({ staff: S2, date: SAT, start: 10, now: new Date(2026, 9, 24, 10, 1) }), { ok: false, reason: "PAST" });
  assert.deepEqual(slot({ staff: S2, date: SAT, start: 10, now: new Date(2026, 9, 24, 9, 59) }), { ok: true });
  assert.deepEqual(slot({ staff: S2, date: "2026-10-20", start: 10 }), { ok: false, reason: "PAST" });
});

// ---- 判定の優先順 PAST → DAY_OFF → OUTSIDE_HOURS → INSUFFICIENT_TIME → BOOKED ----
test("優先順: PAST は DAY_OFF より先", () => {
  // s1 は土曜休み。今日 10:00 の 9 時枠 → PAST
  const now = new Date(2026, 9, 24, 10, 0);
  assert.deepEqual(slot({ date: SAT, start: 9, now }), { ok: false, reason: "PAST" });
});

test("優先順: DAY_OFF は OUTSIDE_HOURS より先", () => {
  assert.deepEqual(slot({ date: SUN, start: 8 }), { ok: false, reason: "DAY_OFF" });
});

test("優先順: OUTSIDE_HOURS は INSUFFICIENT_TIME より先", () => {
  const staff = { id: "x", workDays: [1], start: 10, end: 11 }; // 月のみ 10〜11
  assert.deepEqual(slot({ staff, start: 9, hours: 4 }), { ok: false, reason: "OUTSIDE_HOURS" }); // 13>11 でもある
});

test("優先順: INSUFFICIENT_TIME は BOOKED より先", () => {
  const bookings = [paid("a", "s1", MON, 16, 1)];
  assert.deepEqual(slot({ bookings, start: 16, hours: 2 }), { ok: false, reason: "INSUFFICIENT_TIME" });
});

test("優先順: 休み設定の日に予約があっても DAY_OFF", () => {
  assert.deepEqual(
    slot({ bookings: [paid("a", "s1", MON, 10, 2)], daysOff: [{ staffId: "s1", date: MON }], start: 10 }),
    { ok: false, reason: "DAY_OFF" });
});

// ---- openStarts ----
const STARTS = [9, 10, 11, 12, 13, 14, 15, 16];

test("openStarts: 予約なしの s1 月曜 2 時間は 9〜15", () => {
  assert.deepEqual(
    openStarts({ staff: S1, date: MON, hours: 2, bookings: [], daysOff: [], now: NOW, starts: STARTS }),
    [9, 10, 11, 12, 13, 14, 15]);
});

test("openStarts: 10〜12 が予約済みなら 2 時間は 9・10・11 が ×（隣接の 12 は ○）", () => {
  const bookings = [paid("a", "s1", MON, 10, 2)];
  assert.deepEqual(
    openStarts({ staff: S1, date: MON, hours: 2, bookings, daysOff: [], now: NOW, starts: STARTS }),
    [12, 13, 14, 15]);
});

test("openStarts: 4 時間は終了時刻ちょうど（13 開始）まで", () => {
  const bookings = [paid("a", "s1", MON, 10, 2)];
  assert.deepEqual(
    openStarts({ staff: S1, date: MON, hours: 4, bookings, daysOff: [], now: NOW, starts: STARTS }),
    [12, 13]);
});

test("openStarts: 休み・勤務外の日は空配列、starts を渡した範囲だけ見る", () => {
  assert.deepEqual(openStarts({ staff: S1, date: SUN, hours: 2, bookings: [], daysOff: [], now: NOW, starts: STARTS }), []);
  assert.deepEqual(openStarts({ staff: S1, date: MON, hours: 2, bookings: [], daysOff: [], now: NOW, starts: [10, 11] }), [10, 11]);
});

// ---- assignStaff ----
const any = (o) => ({ staffList: STAFF, date: MON, start: 10, hours: 2, bookings: [], daysOff: [], now: NOW, ...o });

test("assignStaff: staffList の並び順で最初の ○ の id", () => {
  assert.equal(assignStaff(any({})), "s1");
  assert.equal(assignStaff(any({ staffList: [S3, S2, S1] })), "s3");
});

test("assignStaff: 先頭が × なら次の人（s1 予約済み → s2 は月曜休み → s3）", () => {
  assert.equal(assignStaff(any({ bookings: [paid("a", "s1", MON, 10, 2)] })), "s3");
});

test("assignStaff: 9 時枠は s3 が OUTSIDE_HOURS なので s1 が取れなければ null", () => {
  assert.equal(assignStaff(any({ start: 9, bookings: [paid("a", "s1", MON, 9, 2)] })), null);
});

test("assignStaff: 全員 × なら null", () => {
  const bookings = [paid("a", "s1", MON, 10, 2), paid("b", "s3", MON, 10, 2)];
  assert.equal(assignStaff(any({ bookings })), null);
});

test("assignStaff: 休み設定は除外、期限切れ pending は除外されない", () => {
  assert.equal(assignStaff(any({ daysOff: [{ staffId: "s1", date: MON }] })), "s3");
  assert.equal(assignStaff(any({ bookings: [pending("a", "s1", MON, 10, 2, min(-5))] })), "s1");
});

// ---- slotStatusAny ----
test("slotStatusAny: 誰か ○ なら { ok: true, staffId }（並び順の先頭）", () => {
  assert.deepEqual(slotStatusAny(any({})), { ok: true, staffId: "s1" });
  assert.deepEqual(slotStatusAny(any({ bookings: [paid("a", "s1", MON, 10, 2)] })), { ok: true, staffId: "s3" });
});

test("slotStatusAny: 全員 × で BOOKED が 1 人でもあれば BOOKED（優先順の前の理由があっても）", () => {
  // 日曜 10 時: s1 DAY_OFF / s2 BOOKED / s3 DAY_OFF
  const r = slotStatusAny(any({ date: SUN, bookings: [paid("a", "s2", SUN, 10, 2)] }));
  assert.deepEqual(r, { ok: false, reason: "BOOKED" });
});

test("slotStatusAny: BOOKED が無ければ優先順で最も前の理由", () => {
  // 日曜 8 時: s1 DAY_OFF / s2 OUTSIDE_HOURS / s3 DAY_OFF → DAY_OFF
  assert.deepEqual(slotStatusAny(any({ date: SUN, start: 8 })), { ok: false, reason: "DAY_OFF" });
  // s2 だけ: 日曜 14 時 2 時間 → INSUFFICIENT_TIME
  assert.deepEqual(slotStatusAny(any({ staffList: [S2], date: SUN, start: 14 })), { ok: false, reason: "INSUFFICIENT_TIME" });
  // s2 だけ: 日曜 8 時 → OUTSIDE_HOURS
  assert.deepEqual(slotStatusAny(any({ staffList: [S2], date: SUN, start: 8 })), { ok: false, reason: "OUTSIDE_HOURS" });
});

test("slotStatusAny: 過去の枠は全員 PAST", () => {
  const now = new Date(2026, 9, 24, 12, 0);
  assert.deepEqual(slotStatusAny(any({ date: SAT, start: 10, now })), { ok: false, reason: "PAST" });
});

// ---- dayHasOpening ----
const day = (o) => ({ staffList: STAFF, date: MON, hours: 2, bookings: [], daysOff: [], now: NOW, starts: STARTS, ...o });

test("dayHasOpening: 空きのある日は true", () => {
  assert.equal(dayHasOpening(day({})), true);
});

test("dayHasOpening: 全員休み（勤務外・休み設定）の日は false", () => {
  // 月曜: s2 は勤務外、s1・s3 は休み設定
  const daysOff = [{ staffId: "s1", date: MON }, { staffId: "s3", date: MON }];
  assert.equal(dayHasOpening(day({ daysOff })), false);
});

test("dayHasOpening: 1 人でも空いていれば true", () => {
  assert.equal(dayHasOpening(day({ daysOff: [{ staffId: "s1", date: MON }] })), true); // s3 が空き
});

test("dayHasOpening: 唯一の勤務者が全枠予約済みなら false", () => {
  // 日曜は s2（9〜15）のみ。[9,12) と [12,15) で埋まる
  const bookings = [paid("a", "s2", SUN, 9, 3), paid("b", "s2", SUN, 12, 3)];
  assert.equal(dayHasOpening(day({ date: SUN, bookings })), false);
  assert.equal(dayHasOpening(day({ date: SUN, bookings: [bookings[0]] })), true); // 12〜 が空く
});

test("dayHasOpening: 今日で全枠が過去なら false", () => {
  const late = new Date(2026, 9, 24, 20, 0);
  assert.equal(dayHasOpening(day({ date: SAT, now: late })), false);
});

test("dayHasOpening: 利用時間が長いと空きが無くなる（s2 日曜 9〜15 に 4 時間枠、10〜12 予約）", () => {
  const bookings = [paid("a", "s2", SUN, 10, 2)];
  // 4 時間: 9〜13 × / 10〜14 × / 11〜15 × / 12 以降は終了超過
  assert.equal(dayHasOpening(day({ date: SUN, hours: 4, bookings })), false);
  assert.equal(dayHasOpening(day({ date: SUN, hours: 2, bookings })), true);
});

// ---- findConflicts ----
test("findConflicts: 期限切れ後に paid になった予約が他の有効な予約と重なる", () => {
  // a は期限切れ pending だった予約が paid 化したもの（expiresAt が過去の paid）。b は後から同枠に入った paid
  const a = { ...pending("a", "s1", MON, 10, 2, min(-30)), status: "paid", sessionId: "cs_test_x" };
  const b = paid("b", "s1", MON, 11, 2);
  const r = findConflicts([a, b], NOW);
  assert.ok(r instanceof Set);
  assert.deepEqual([...r].sort(), ["a", "b"]);
});

test("findConflicts: 期限内 pending と重なる paid は含み、pending 自身は含まない", () => {
  const p = pending("p", "s1", MON, 10, 2, min(10));
  const x = paid("x", "s1", MON, 11, 2);
  assert.deepEqual([...findConflicts([p, x], NOW)], ["x"]);
});

test("findConflicts: 期限切れ pending・cancelled と重なる paid は含まない", () => {
  const e = pending("e", "s1", MON, 10, 2, min(-1));
  const c = cancelled("c", "s1", MON, 10, 2);
  const x = paid("x", "s1", MON, 10, 2);
  assert.equal(findConflicts([e, c, x], NOW).size, 0);
});

test("findConflicts: 隣接・別スタッフ・別日は重複ではない", () => {
  const bookings = [
    paid("a", "s1", MON, 10, 2),
    paid("b", "s1", MON, 12, 2),          // 隣接
    paid("c", "s3", MON, 10, 2),          // 別スタッフ
    paid("d", "s1", "2026-10-27", 10, 2), // 別日
  ];
  assert.equal(findConflicts(bookings, NOW).size, 0);
});

test("findConflicts: 空配列は空の Set", () => {
  const r = findConflicts([], NOW);
  assert.ok(r instanceof Set);
  assert.equal(r.size, 0);
});
