// 仕様: docs/spec-core.md「補足2」の理由コード（OUTSIDE_HOURS の範囲、slotStatusAny の理由の選び方）
import { test } from "node:test";
import assert from "node:assert/strict";
import { slotStatus, openStarts, slotStatusAny } from "../../js/availability.js";

const S1 = { id: "s1", name: "山本 さち子", workDays: [1, 2, 3, 5], start: 9, end: 17 };  // 月火水金
const S2 = { id: "s2", name: "小林 和美", workDays: [2, 4, 6, 0], start: 9, end: 15 };    // 火木土日
const S3 = { id: "s3", name: "森田 恵", workDays: [1, 3, 4, 5, 6], start: 10, end: 17 };  // 月水木金土
const STAFF = [S1, S2, S3];

const NOW = new Date(2026, 9, 24, 8, 0);
const SUN = "2026-10-25", MON = "2026-10-26", TUE = "2026-10-27"; // 火: s1・s2 勤務、s3 勤務外
const STARTS = [9, 10, 11, 12, 13, 14, 15, 16];
const paid = (id, staffId, date, start, hours) => ({ id, staffId, date, start, hours, status: "paid" });

const slot = (o) => slotStatus({ staff: S1, date: MON, start: 9, hours: 2, bookings: [], daysOff: [], now: NOW, ...o });
const any = (o) => ({ staffList: STAFF, date: MON, start: 10, hours: 2, bookings: [], daysOff: [], now: NOW, ...o });

// ---- OUTSIDE_HOURS: start < staff.start または start >= staff.end ----
test("OUTSIDE_HOURS 境界(s1 9〜17): start=end と 1 つ先は OUTSIDE_HOURS、1 つ手前は INSUFFICIENT_TIME", () => {
  assert.deepEqual(slot({ start: 16, hours: 2 }), { ok: false, reason: "INSUFFICIENT_TIME" }); // 1つ手前
  assert.deepEqual(slot({ start: 17, hours: 2 }), { ok: false, reason: "OUTSIDE_HOURS" });     // ちょうど end
  assert.deepEqual(slot({ start: 18, hours: 2 }), { ok: false, reason: "OUTSIDE_HOURS" });     // 1つ先
});

test("OUTSIDE_HOURS 境界(s2 9〜15): 14 は INSUFFICIENT_TIME、15・16 は OUTSIDE_HOURS", () => {
  const s2 = (start) => slot({ staff: S2, date: SUN, start, hours: 2 });
  assert.deepEqual(s2(14), { ok: false, reason: "INSUFFICIENT_TIME" });
  assert.deepEqual(s2(15), { ok: false, reason: "OUTSIDE_HOURS" });
  assert.deepEqual(s2(16), { ok: false, reason: "OUTSIDE_HOURS" });
});

test("OUTSIDE_HOURS: 勤務時間外の 16 時開始は、予約と重なっていても OUTSIDE_HOURS", () => {
  const bookings = [paid("a", "s2", SUN, 16, 2)];
  assert.deepEqual(slot({ staff: S2, date: SUN, start: 16, bookings }), { ok: false, reason: "OUTSIDE_HOURS" });
});

test("OUTSIDE_HOURS: 4 時間でも start >= end なら OUTSIDE_HOURS（INSUFFICIENT_TIME ではない）", () => {
  assert.deepEqual(slot({ staff: S2, date: SUN, start: 16, hours: 4 }), { ok: false, reason: "OUTSIDE_HOURS" });
  assert.deepEqual(slot({ staff: S2, date: SUN, start: 12, hours: 4 }), { ok: false, reason: "INSUFFICIENT_TIME" });
});

test("openStarts: s2 日曜 2 時間は 9〜13 だけ（15・16 は OUTSIDE_HOURS で ×）", () => {
  assert.deepEqual(
    openStarts({ staff: S2, date: SUN, hours: 2, bookings: [], daysOff: [], now: NOW, starts: STARTS }),
    [9, 10, 11, 12, 13]);
});

// ---- slotStatusAny: 全員 × の時の理由 ----
test("slotStatusAny: BOOKED > INSUFFICIENT_TIME（火 14 時: s1 BOOKED / s2 INSUFFICIENT_TIME / s3 DAY_OFF）", () => {
  const bookings = [paid("a", "s1", TUE, 14, 2)];
  assert.deepEqual(slotStatusAny(any({ date: TUE, start: 14, bookings })), { ok: false, reason: "BOOKED" });
});

test("slotStatusAny: INSUFFICIENT_TIME > DAY_OFF（火 14 時: s1 休み設定 / s2 INSUFFICIENT_TIME / s3 勤務外）", () => {
  const daysOff = [{ staffId: "s1", date: TUE }];
  assert.deepEqual(slotStatusAny(any({ date: TUE, start: 14, daysOff })), { ok: false, reason: "INSUFFICIENT_TIME" });
});

test("slotStatusAny: INSUFFICIENT_TIME > OUTSIDE_HOURS（並び順によらない）", () => {
  const early = { id: "x", name: "x", workDays: [2], start: 9, end: 12 };  // 火 16 時 → OUTSIDE_HOURS
  const short = { id: "y", name: "y", workDays: [2], start: 9, end: 17 };  // 火 16 時 2h → INSUFFICIENT_TIME
  assert.deepEqual(slotStatusAny(any({ staffList: [early, short], date: TUE, start: 16 })), { ok: false, reason: "INSUFFICIENT_TIME" });
  assert.deepEqual(slotStatusAny(any({ staffList: [short, early], date: TUE, start: 16 })), { ok: false, reason: "INSUFFICIENT_TIME" });
});

test("slotStatusAny: BOOKED も INSUFFICIENT_TIME も無ければ優先順で最も前の理由", () => {
  assert.deepEqual(slotStatusAny(any({ staffList: [S2], date: TUE, start: 15 })), { ok: false, reason: "OUTSIDE_HOURS" });
  // 火 8 時: s1・s2 OUTSIDE_HOURS / s3 DAY_OFF → DAY_OFF が前
  assert.deepEqual(slotStatusAny(any({ date: TUE, start: 8 })), { ok: false, reason: "DAY_OFF" });
});

test("slotStatusAny: staffList が空なら DAY_OFF", () => {
  assert.deepEqual(slotStatusAny(any({ staffList: [] })), { ok: false, reason: "DAY_OFF" });
});

test("slotStatusAny: 誰か 1 人でも ○ なら、他に INSUFFICIENT_TIME がいても ok", () => {
  // 火 14 時 2 時間: s1 ○、s2 は INSUFFICIENT_TIME、s3 は勤務外 → s1 で ok
  assert.deepEqual(slotStatusAny(any({ date: TUE, start: 14 })), { ok: true, staffId: "s1" });
});
