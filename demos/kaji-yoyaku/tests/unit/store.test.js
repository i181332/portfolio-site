// 仕様: docs/spec-core.md「js/store.js」「初期シード」、PLAN.md「データ」「Stripe 連携」
import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../../js/store.js";

const NOW = new Date(2026, 9, 24, 8, 0); // 2026-10-24（土）8:00 ローカル

// Map を包んだ偽の storage
function fakeStorage(map = new Map()) {
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
  };
}

// テスト用の可変時計
function setup(start = NOW) {
  const clock = { t: new Date(start.getTime()) };
  const storage = fakeStorage();
  const open = () => createStore(storage, { now: () => new Date(clock.t.getTime()) });
  return { clock, storage, open, store: open() };
}

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const plusDays = (base, n) => ymd(new Date(base.getFullYear(), base.getMonth(), base.getDate() + n));
const customer = { name: "テスト 太郎", phone: "090-0000-0000", address: "東京都", notes: "" };
const FAR = "2026-11-20"; // シードに現れない日（今日から 27 日後）

// ---- 初期シード ----
test("初回: スタッフ 3 名（s1 山本 さち子 / s2 小林 和美 / s3 森田 恵）", () => {
  const { store } = setup();
  const staff = store.getStaff();
  assert.equal(staff.length, 3);
  assert.deepEqual(staff.map((s) => s.id), ["s1", "s2", "s3"]);
  assert.deepEqual(staff.map((s) => s.name), ["山本 さち子", "小林 和美", "森田 恵"]);
  for (const s of staff) {
    assert.equal(typeof s.intro, "string");
    assert.ok(Array.isArray(s.skills));
    assert.ok(Array.isArray(s.workDays));
  }
});

test("初回: 勤務時間（s1 9〜17 / s2 9〜15 / s3 10〜17）", () => {
  const staff = Object.fromEntries(setup().store.getStaff().map((s) => [s.id, s]));
  assert.deepEqual([staff.s1.start, staff.s1.end], [9, 17]);
  assert.deepEqual([staff.s2.start, staff.s2.end], [9, 15]);
  assert.deepEqual([staff.s3.start, staff.s3.end], [10, 17]);
});

// 仕様の解釈: workDays は getDay() の値（0=日〜6=土）の配列
test("初回: 勤務曜日（s1 月火水金 / s2 火木土日 / s3 月水木金土）", () => {
  const staff = Object.fromEntries(setup().store.getStaff().map((s) => [s.id, s]));
  assert.deepEqual([...staff.s1.workDays].sort(), [1, 2, 3, 5]);
  assert.deepEqual([...staff.s2.workDays].sort(), [0, 2, 4, 6]);
  assert.deepEqual([...staff.s3.workDays].sort(), [1, 3, 4, 5, 6]);
});

test("初回: paid の予約が 4 件以上で、日付は今日から 1〜3 日後", () => {
  const { store } = setup();
  const bookings = store.getBookings();
  assert.ok(bookings.length >= 4);
  const allowed = [1, 2, 3].map((n) => plusDays(NOW, n)); // 10-25〜10-27
  for (const b of bookings) {
    assert.equal(b.status, "paid");
    assert.ok(allowed.includes(b.date), `${b.id} の日付 ${b.date}`);
    assert.ok(["s1", "s2", "s3"].includes(b.staffId));
    assert.ok([2, 3, 4].includes(b.hours));
  }
});

test("初回: 休みが 2 件で、日付は今日から 2〜6 日後", () => {
  const { store } = setup();
  const off = store.getDaysOff();
  assert.equal(off.length, 2);
  const allowed = [2, 3, 4, 5, 6].map((n) => plusDays(NOW, n)); // 10-26〜10-30
  for (const d of off) {
    assert.ok(allowed.includes(d.date), d.date);
    assert.ok(["s1", "s2", "s3"].includes(d.staffId));
  }
});

test("シードは now を基準に相対（月またぎ: 10-30 起点なら予約は 10-31〜11-02）", () => {
  const base = new Date(2026, 9, 30, 8, 0);
  const { store } = setup(base);
  const allowed = [1, 2, 3].map((n) => plusDays(base, n));
  assert.deepEqual(allowed, ["2026-10-31", "2026-11-01", "2026-11-02"]);
  for (const b of store.getBookings()) assert.ok(allowed.includes(b.date), b.date);
  const offAllowed = [2, 3, 4, 5, 6].map((n) => plusDays(base, n));
  for (const d of store.getDaysOff()) assert.ok(offAllowed.includes(d.date), d.date);
});

test("getBookings は date, start の昇順", () => {
  const { store } = setup();
  store.addBooking({ staffId: "s1", date: plusDays(NOW, 1), start: 9, hours: 2, customer });
  store.addBooking({ staffId: "s1", date: FAR, start: 9, hours: 2, customer });
  store.addBooking({ staffId: "s3", date: plusDays(NOW, 1), start: 16, hours: 2, customer });
  const list = store.getBookings();
  const keys = list.map((b) => `${b.date} ${String(b.start).padStart(2, "0")}`);
  assert.deepEqual(keys, [...keys].sort());
});

test("now を省略しても動く（既定は現在時刻）", () => {
  const store = createStore(fakeStorage());
  assert.equal(store.getStaff().length, 3);
  assert.ok(store.getBookings().length >= 4);
});

test("保存キーはすべて kajiDemo. で始まる", () => {
  const { store, storage } = setup();
  store.getStaff(); store.getBookings(); store.getDaysOff(); store.getPrefs();
  store.addBooking({ staffId: "s1", date: FAR, start: 9, hours: 2, customer });
  store.toggleDayOff("s1", FAR);
  store.setPrefs({ fontScale: "large" });
  store.setPendingId("A-1120-1");
  assert.ok(storage.map.size > 0);
  for (const k of storage.map.keys()) assert.ok(k.startsWith("kajiDemo."), k);
});

test("2 回目の createStore はシードし直さず、保存済みを読む", () => {
  const { store, open } = setup();
  const b = store.addBooking({ staffId: "s1", date: FAR, start: 9, hours: 2, customer });
  const again = open();
  assert.ok(again.getBookings().some((x) => x.id === b.id));
});

// ---- addBooking ----
test("addBooking: pending・amount = hours × 3500・createdAt・expiresAt は 15 分後", () => {
  const { store } = setup();
  const b = store.addBooking({ staffId: "s1", date: FAR, start: 10, hours: 3, customer });
  assert.equal(b.status, "pending");
  assert.equal(b.amount, 10500);
  assert.equal(b.staffId, "s1");
  assert.equal(b.date, FAR);
  assert.equal(b.start, 10);
  assert.equal(b.hours, 3);
  assert.deepEqual(b.customer, customer);
  assert.equal(typeof b.createdAt, "string");
  assert.equal(new Date(b.createdAt).getTime(), NOW.getTime());
  assert.equal(new Date(b.expiresAt).getTime() - new Date(b.createdAt).getTime(), 15 * 60 * 1000);
});

test("addBooking: amount は 2/3/4 時間で 7000/10500/14000", () => {
  const { store } = setup();
  const amounts = [2, 3, 4].map((h, i) => store.addBooking({ staffId: "s1", date: plusDays(NOW, 20 + i), start: 9, hours: h, customer }).amount);
  assert.deepEqual(amounts, [7000, 10500, 14000]);
});

test("addBooking: id は A-MMDD-n（MMDD は予約日）で同じ日付なら連番", () => {
  const { store } = setup();
  const a = store.addBooking({ staffId: "s1", date: FAR, start: 9, hours: 2, customer });
  const b = store.addBooking({ staffId: "s3", date: FAR, start: 12, hours: 2, customer });
  const c = store.addBooking({ staffId: "s1", date: "2026-11-21", start: 9, hours: 2, customer });
  assert.equal(a.id, "A-1120-1");
  assert.equal(b.id, "A-1120-2");
  assert.equal(c.id, "A-1121-1"); // 日付が違えば 1 から
});

test("addBooking: 月・日は 2 桁ゼロ埋め（1 月 5 日 → A-0105-1）", () => {
  const { store } = setup();
  assert.equal(store.addBooking({ staffId: "s1", date: "2027-01-05", start: 9, hours: 2, customer }).id, "A-0105-1");
});

test("addBooking: シード済みの日付では既存最大 + 1", () => {
  const { store } = setup();
  const date = plusDays(NOW, 1); // 2026-10-25（シード予約がある日）
  const nums = store.getBookings()
    .map((b) => b.id.match(/^A-1025-(\d+)$/))
    .filter(Boolean).map((m) => Number(m[1]));
  const max = nums.length ? Math.max(...nums) : 0;
  const b = store.addBooking({ staffId: "s2", date, start: 9, hours: 2, customer });
  assert.equal(b.id, `A-1025-${max + 1}`);
});

test("addBooking: キャンセル済みがあっても番号は再利用せず既存最大 + 1", () => {
  const { store } = setup();
  const a = store.addBooking({ staffId: "s1", date: FAR, start: 9, hours: 2, customer });
  const b = store.addBooking({ staffId: "s1", date: FAR, start: 12, hours: 2, customer });
  store.cancelBooking(b.id);
  const c = store.addBooking({ staffId: "s1", date: FAR, start: 14, hours: 2, customer });
  assert.deepEqual([a.id, b.id, c.id], ["A-1120-1", "A-1120-2", "A-1120-3"]);
});

test("addBooking: 保存され、別の createStore からも読める", () => {
  const { store, open } = setup();
  const b = store.addBooking({ staffId: "s1", date: FAR, start: 9, hours: 2, customer });
  assert.deepEqual(store.getBookings().find((x) => x.id === b.id), b);
  assert.deepEqual(open().getBookings().find((x) => x.id === b.id), b);
});

test("addBooking: createdAt は now() の時刻（時計を進めると変わる）", () => {
  const { store, clock } = setup();
  clock.t = new Date(2026, 9, 24, 9, 30);
  const b = store.addBooking({ staffId: "s1", date: FAR, start: 9, hours: 2, customer });
  assert.equal(new Date(b.createdAt).getTime(), clock.t.getTime());
  assert.equal(new Date(b.expiresAt).getTime(), clock.t.getTime() + 15 * 60000);
});

// ---- markPaid / cancelBooking ----
// 仕様の解釈: markPaid / cancelBooking の戻り値は仕様に無いので、getBookings() で確認する。
test("markPaid: paid・paidAt・sessionId", () => {
  const { store, clock } = setup();
  const b = store.addBooking({ staffId: "s1", date: FAR, start: 9, hours: 2, customer });
  clock.t = new Date(2026, 9, 24, 8, 5);
  store.markPaid(b.id, { sessionId: "cs_test_abc123" });
  const got = store.getBookings().find((x) => x.id === b.id);
  assert.equal(got.status, "paid");
  assert.equal(got.sessionId, "cs_test_abc123");
  assert.equal(new Date(got.paidAt).getTime(), clock.t.getTime());
});

test("markPaid: sessionId なしでも paid（sessionId は付かない）", () => {
  const { store } = setup();
  const b = store.addBooking({ staffId: "s1", date: FAR, start: 9, hours: 2, customer });
  store.markPaid(b.id);
  const got = store.getBookings().find((x) => x.id === b.id);
  assert.equal(got.status, "paid");
  assert.ok(!got.sessionId);
  assert.ok(got.paidAt);
});

test("markPaid: 期限切れ（15 分 + 1 分後）の pending でも paid になる", () => {
  const { store, clock } = setup();
  const b = store.addBooking({ staffId: "s1", date: FAR, start: 9, hours: 2, customer });
  clock.t = new Date(NOW.getTime() + 16 * 60000);
  store.markPaid(b.id, { sessionId: "cs_test_late" });
  assert.equal(store.getBookings().find((x) => x.id === b.id).status, "paid");
});

test("markPaid: 他の予約には影響しない・保存される", () => {
  const { store, open } = setup();
  const a = store.addBooking({ staffId: "s1", date: FAR, start: 9, hours: 2, customer });
  const b = store.addBooking({ staffId: "s1", date: FAR, start: 12, hours: 2, customer });
  store.markPaid(a.id);
  const re = open().getBookings();
  assert.equal(re.find((x) => x.id === a.id).status, "paid");
  assert.equal(re.find((x) => x.id === b.id).status, "pending");
});

test("cancelBooking: cancelled になり、一覧には残る", () => {
  const { store, open } = setup();
  const b = store.addBooking({ staffId: "s1", date: FAR, start: 9, hours: 2, customer });
  store.cancelBooking(b.id);
  assert.equal(store.getBookings().find((x) => x.id === b.id).status, "cancelled");
  assert.equal(open().getBookings().find((x) => x.id === b.id).status, "cancelled");
});

test("cancelBooking: paid のシード予約も取り消せる", () => {
  const { store } = setup();
  const seed = store.getBookings()[0];
  store.cancelBooking(seed.id);
  assert.equal(store.getBookings().find((x) => x.id === seed.id).status, "cancelled");
});

// ---- daysOff ----
test("toggleDayOff: 休みにすると true、もう一度で false（往復）", () => {
  const { store } = setup();
  assert.equal(store.toggleDayOff("s1", FAR), true);
  assert.ok(store.getDaysOff().some((d) => d.staffId === "s1" && d.date === FAR));
  assert.equal(store.toggleDayOff("s1", FAR), false);
  assert.ok(!store.getDaysOff().some((d) => d.staffId === "s1" && d.date === FAR));
});

test("toggleDayOff: 別スタッフ・別日は独立、保存される", () => {
  const { store, open } = setup();
  const before = store.getDaysOff().length;
  store.toggleDayOff("s1", FAR);
  store.toggleDayOff("s2", FAR);
  assert.equal(store.getDaysOff().length, before + 2);
  store.toggleDayOff("s1", FAR);
  const re = open().getDaysOff();
  assert.equal(re.length, before + 1);
  assert.ok(re.some((d) => d.staffId === "s2" && d.date === FAR));
});

test("toggleDayOff: シードの休みをトグルすると解除（false）", () => {
  const { store } = setup();
  const first = store.getDaysOff()[0];
  assert.equal(store.toggleDayOff(first.staffId, first.date), false);
  assert.equal(store.getDaysOff().length, 1);
});

// ---- prefs ----
test("prefs: 既定は fontScale normal", () => {
  assert.equal(setup().store.getPrefs().fontScale, "normal");
});

test("prefs: setPrefs で保存され、再読込でも残る・戻せる", () => {
  const { store, open } = setup();
  store.setPrefs({ fontScale: "large" });
  assert.equal(store.getPrefs().fontScale, "large");
  assert.equal(open().getPrefs().fontScale, "large");
  store.setPrefs({ fontScale: "normal" });
  assert.equal(open().getPrefs().fontScale, "normal");
});

// ---- pendingId ----
// 仕様の解釈: 未設定時の getPendingId() の値は仕様に無いので null / undefined のどちらも許容する。
test("pendingId: 未設定 → set → get → clear の 3 操作", () => {
  const { store, open } = setup();
  assert.ok(store.getPendingId() == null);
  store.setPendingId("A-1120-1");
  assert.equal(store.getPendingId(), "A-1120-1");
  assert.equal(open().getPendingId(), "A-1120-1");
  store.clearPendingId();
  assert.ok(store.getPendingId() == null);
  assert.ok(open().getPendingId() == null);
});

test("pendingId: 上書きできる", () => {
  const { store } = setup();
  store.setPendingId("A-1120-1");
  store.setPendingId("A-1120-2");
  assert.equal(store.getPendingId(), "A-1120-2");
});

// ---- reset ----
test("reset: 予約・休みが初期シードに戻り、prefs は残る", () => {
  const { store } = setup();
  const seedCount = store.getBookings().length;
  const seedOff = store.getDaysOff().length;
  const b = store.addBooking({ staffId: "s1", date: FAR, start: 9, hours: 2, customer });
  store.toggleDayOff("s2", FAR);
  store.setPrefs({ fontScale: "large" });
  store.reset();
  assert.ok(!store.getBookings().some((x) => x.id === b.id));
  assert.equal(store.getBookings().length, seedCount);
  assert.equal(store.getDaysOff().length, seedOff);
  assert.ok(!store.getDaysOff().some((d) => d.date === FAR));
  assert.equal(store.getPrefs().fontScale, "large");
  assert.equal(store.getStaff().length, 3);
});

// 仕様の解釈: 「全キーを消して…（prefs は残す）」から、pendingId も消えると読む。
test("reset: pendingId も消える", () => {
  const { store } = setup();
  store.setPendingId("A-1120-1");
  store.reset();
  assert.ok(store.getPendingId() == null);
});

test("reset: 取り消したシード予約も元に戻る", () => {
  const { store } = setup();
  const seed = store.getBookings()[0];
  store.cancelBooking(seed.id);
  store.reset();
  assert.equal(store.getBookings().find((x) => x.id === seed.id)?.status, "paid");
});

test("reset: now を進めていれば、新しい今日を基準に作り直す", () => {
  const { store, clock } = setup();
  clock.t = new Date(2026, 10, 10, 8, 0);
  store.reset();
  const allowed = [1, 2, 3].map((n) => plusDays(clock.t, n));
  for (const b of store.getBookings()) assert.ok(allowed.includes(b.date), b.date);
});

// ---- 壊れた JSON ----
// キー名は仕様に無い（kajiDemo.+名前）ので、保存済みの全キーを壊す。
function corruptAll(storage) {
  for (const k of [...storage.map.keys()]) storage.map.set(k, "{not json");
}

// 仕様の解釈: pendingId も壊れた値は「未設定」に戻ると読む（pendingId の保存形式は仕様に無い）。
test("壊れた JSON: 例外を出さずシードに戻る（全キー破損）", () => {
  const { store, storage, open } = setup();
  store.addBooking({ staffId: "s1", date: FAR, start: 9, hours: 2, customer });
  store.toggleDayOff("s1", FAR);
  store.setPrefs({ fontScale: "large" });
  store.setPendingId("A-1120-1");
  corruptAll(storage);
  const again = open();
  assert.doesNotThrow(() => {
    again.getStaff(); again.getBookings(); again.getDaysOff(); again.getPrefs(); again.getPendingId();
  });
  assert.equal(again.getStaff().length, 3);
  assert.ok(again.getBookings().length >= 4);
  assert.ok(again.getBookings().every((b) => b.status === "paid"));
  assert.equal(again.getDaysOff().length, 2);
  assert.equal(again.getPrefs().fontScale, "normal");
  assert.ok(again.getPendingId() == null);
});

test("壊れた JSON: 復旧後は通常どおり書き込める", () => {
  const { store, storage, open } = setup();
  store.getBookings();
  corruptAll(storage);
  const again = open();
  const b = again.addBooking({ staffId: "s1", date: FAR, start: 9, hours: 2, customer });
  assert.equal(b.id, "A-1120-1");
  assert.ok(open().getBookings().some((x) => x.id === b.id));
});

test("壊れた JSON: 空文字でも例外を出さない", () => {
  const { store, storage, open } = setup();
  store.getBookings();
  for (const k of [...storage.map.keys()]) storage.map.set(k, "");
  const again = open();
  assert.doesNotThrow(() => again.getBookings());
  assert.ok(again.getBookings().length >= 4);
});
