// 仕様: docs/spec-core.md「js/format.js」
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatDate, dateParts, formatHour, formatRange, formatYen, yenParts, toISODate, addDays,
} from "../../js/format.js";

// 仕様の解釈: 仕様表の例 "2026-10-25" → "10月25日（土）" は暦と合わない
// （2026-10-24 が土曜、10-25 は日曜）。仕様の文言「曜日は new Date(y,m-1,d).getDay()」を優先し、
// 実際の曜日で期待値を置く。表の例の誤記は返却で報告。
test("formatDate: 実際の曜日で 月日（曜）", () => {
  assert.equal(formatDate("2026-10-24"), "10月24日（土）");
  assert.equal(formatDate("2026-10-25"), "10月25日（日）");
  assert.equal(formatDate("2026-10-26"), "10月26日（月）");
});

test("formatDate: 月日はゼロ埋めしない", () => {
  assert.equal(formatDate("2026-01-05"), "1月5日（月）");
});

test("dateParts: 曜日 7 種", () => {
  const exp = [
    ["2026-10-24", 24, "土"], ["2026-10-25", 25, "日"], ["2026-10-26", 26, "月"],
    ["2026-10-27", 27, "火"], ["2026-10-28", 28, "水"], ["2026-10-29", 29, "木"],
    ["2026-10-30", 30, "金"],
  ];
  for (const [iso, day, dow] of exp) {
    assert.deepEqual(dateParts(iso), { month: 10, day, dow });
  }
});

test("dateParts: month/day は数値でゼロ埋めなし", () => {
  assert.deepEqual(dateParts("2026-01-05"), { month: 1, day: 5, dow: "月" });
});

test("formatHour: 仕様の例", () => {
  assert.equal(formatHour(9), "午前9時");
  assert.equal(formatHour(11), "午前11時");
  assert.equal(formatHour(12), "午後0時");
  assert.equal(formatHour(13), "午後1時");
  assert.equal(formatHour(16), "午後4時");
});

test("formatHour: 午前/午後の境（11→12）と他の時刻", () => {
  assert.equal(formatHour(10), "午前10時");
  assert.equal(formatHour(14), "午後2時");
  assert.equal(formatHour(15), "午後3時");
  assert.equal(formatHour(20), "午後8時");
});

test("formatRange: 仕様の例 (10,2)", () => {
  assert.equal(formatRange(10, 2), "午前10時〜午後0時");
});

test("formatRange: 11時開始 2時間は 午後1時まで", () => {
  assert.equal(formatRange(11, 2), "午前11時〜午後1時");
});

test("formatRange: 午前のみ・正午開始・午後のみ・最長", () => {
  assert.equal(formatRange(9, 2), "午前9時〜午前11時");
  assert.equal(formatRange(9, 3), "午前9時〜午後0時");
  assert.equal(formatRange(12, 2), "午後0時〜午後2時");
  assert.equal(formatRange(13, 4), "午後1時〜午後5時");
  assert.equal(formatRange(16, 4), "午後4時〜午後8時");
});

test("formatYen: 桁区切りと「円」", () => {
  assert.equal(formatYen(7000), "7,000円");
  assert.equal(formatYen(10500), "10,500円");
  assert.equal(formatYen(14000), "14,000円");
});

test("formatYen: 境界（0 / 999 / 1000 / 7 桁）", () => {
  assert.equal(formatYen(0), "0円");
  assert.equal(formatYen(999), "999円");
  assert.equal(formatYen(1000), "1,000円");
  assert.equal(formatYen(1234567), "1,234,567円");
});

test("yenParts: num と unit に分ける", () => {
  assert.deepEqual(yenParts(7000), { num: "7,000", unit: "円" });
  assert.deepEqual(yenParts(999), { num: "999", unit: "円" });
});

test("toISODate: ローカル日付でゼロ埋め", () => {
  assert.equal(toISODate(new Date(2026, 9, 24, 8, 0)), "2026-10-24");
  assert.equal(toISODate(new Date(2026, 0, 5, 0, 0)), "2026-01-05");
});

test("toISODate: ローカルの 23:59 / 00:00 で日付が変わらない・変わる", () => {
  assert.equal(toISODate(new Date(2026, 9, 24, 23, 59)), "2026-10-24");
  assert.equal(toISODate(new Date(2026, 9, 25, 0, 0)), "2026-10-25");
  assert.equal(toISODate(new Date(2026, 11, 31, 23, 59)), "2026-12-31");
});

test("addDays: 月またぎ（仕様の例）", () => {
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
});

test("addDays: 年またぎ・0・負・14 日・うるう日", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-10-24", 0), "2026-10-24");
  assert.equal(addDays("2026-11-01", -1), "2026-10-31");
  assert.equal(addDays("2026-10-24", 14), "2026-11-07");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2027-02-28", 1), "2027-03-01");
});
