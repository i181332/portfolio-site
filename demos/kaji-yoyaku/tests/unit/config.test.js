// 仕様: docs/spec-core.md「js/config.js」
import { test } from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../../js/config.js";

test("hourlyRate は 3500", () => {
  assert.equal(CONFIG.hourlyRate, 3500);
});

test("hoursOptions は [2, 3, 4]", () => {
  assert.deepEqual(CONFIG.hoursOptions, [2, 3, 4]);
});

test("slotStarts は 9〜16 の整数 8 個", () => {
  assert.deepEqual(CONFIG.slotStarts, [9, 10, 11, 12, 13, 14, 15, 16]);
});

test("pendingMinutes は 15", () => {
  assert.equal(CONFIG.pendingMinutes, 15);
});

test("bookableDays は 14、storagePrefix は kajiDemo.", () => {
  assert.equal(CONFIG.bookableDays, 14);
  assert.equal(CONFIG.storagePrefix, "kajiDemo.");
});

test("paymentLinks は 2/3/4 時間のキーを持つ（既定は空文字）", () => {
  assert.deepEqual(Object.keys(CONFIG.paymentLinks).sort(), ["2", "3", "4"]);
  for (const h of CONFIG.hoursOptions) {
    assert.equal(typeof CONFIG.paymentLinks[h], "string");
  }
});
