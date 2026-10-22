// 仕様: docs/spec-core.md「補足2・補足3」のシード・壊れたキー・書込み例外・連番・prefs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../../js/store.js";
import { slotStatus, findConflicts, slotStatusAny, dayHasOpening } from "../../js/availability.js";

const NOW = new Date(2026, 9, 24, 8, 0);

function fakeStorage(map = new Map()) {
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
  };
}
function setup(start = NOW) {
  const clock = { t: new Date(start.getTime()) };
  const storage = fakeStorage();
  const open = () => createStore(storage, { now: () => new Date(clock.t.getTime()) });
  return { clock, storage, open, store: open() };
}
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const plusDays = (base, n) => ymd(new Date(base.getFullYear(), base.getMonth(), base.getDate() + n));
const customer = { name: "テスト 太郎", phone: "090-0000-0000", address: "東京都", notes: "" };
const FAR = "2026-11-20";
const dowOf = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).getDay(); };

// ---- シード: 今日を日〜土の 7 通り（2026-10-18 は日曜） ----
const DOW = ["日", "月", "火", "水", "木", "金", "土"];
for (let i = 0; i < 7; i++) {
  const today = new Date(2026, 9, 18 + i, 8, 0);
  const label = `${DOW[today.getDay()]}曜 ${ymd(today)}`;
  const seeded = () => {
    const store = createStore(fakeStorage(), { now: () => new Date(today.getTime()) });
    const staff = Object.fromEntries(store.getStaff().map((s) => [s.id, s]));
    return { staff, bookings: store.getBookings(), daysOff: store.getDaysOff() };
  };

  test(`シード(${label}): 1〜3 日後に BOOKED として見える予約が 3 件以上`, () => {
    const { staff, bookings, daysOff } = seeded();
    const allowed = [1, 2, 3].map((n) => plusDays(today, n));
    const visible = bookings.filter((b) => allowed.includes(b.date)).filter((b) =>
      slotStatus({ staff: staff[b.staffId], date: b.date, start: b.start, hours: b.hours, bookings, daysOff, now: today }).reason === "BOOKED");
    assert.ok(visible.length >= 3, `BOOKED に見える予約 ${visible.length} 件`);
  });

  test(`シード(${label}): 全予約が担当の勤務曜日・勤務時間内で、休みと重ならない`, () => {
    const { staff, bookings, daysOff } = seeded();
    assert.ok(bookings.length > 0);
    for (const b of bookings) {
      const s = staff[b.staffId];
      assert.ok(s.workDays.includes(dowOf(b.date)), `${b.id}: 勤務曜日外 ${b.date}`);
      assert.ok(b.start >= s.start && b.start + b.hours <= s.end, `${b.id}: 勤務時間外 ${b.start}+${b.hours}`);
      assert.ok(!daysOff.some((d) => d.staffId === b.staffId && d.date === b.date), `${b.id}: 休みと重複`);
      assert.deepEqual(
        slotStatus({ staff: s, date: b.date, start: b.start, hours: b.hours, bookings: [], daysOff, now: today }),
        { ok: true }, b.id);
    }
  });

  test(`シード(${label}): 休み 2 件が 2〜6 日後の担当の勤務日`, () => {
    const { staff, daysOff } = seeded();
    assert.equal(daysOff.length, 2);
    const allowed = [2, 3, 4, 5, 6].map((n) => plusDays(today, n));
    for (const d of daysOff) {
      assert.ok(allowed.includes(d.date), d.date);
      assert.ok(staff[d.staffId].workDays.includes(dowOf(d.date)), `${d.staffId} は ${d.date} が勤務日でない`);
    }
  });
}

// ---- 読めないキーは、そのキーだけ既定に戻す ----
test("壊れたキー: daysOff だけ壊す → 予約と pendingId は残り、休みはシードに戻る", () => {
  const { store, storage, open } = setup();
  const b = store.addBooking({ staffId: "s1", date: FAR, start: 9, hours: 2, customer });
  store.setPendingId(b.id);
  storage.map.set("kajiDemo.daysOff", "{not json");
  const again = open();
  assert.ok(again.getBookings().some((x) => x.id === b.id));
  assert.equal(again.getPendingId(), b.id);
  assert.equal(again.getDaysOff().length, 2);
});

test("壊れたキー: staff キーが無い → 予約は残り、スタッフはシードに戻る", () => {
  const { store, storage, open } = setup();
  const b = store.addBooking({ staffId: "s1", date: FAR, start: 9, hours: 2, customer });
  storage.map.delete("kajiDemo.staff");
  const again = open();
  assert.equal(again.getStaff().length, 3);
  assert.ok(again.getBookings().some((x) => x.id === b.id));
});

test("壊れたキー: bookings だけ壊す → 予約はシード、休み・prefs・pendingId は残り、他キーの保存値は書き換わらない", () => {
  const { store, storage, open } = setup();
  store.toggleDayOff("s1", FAR);
  store.setPrefs({ fontScale: "large" });
  store.setPendingId("A-1120-1");
  storage.map.set("kajiDemo.bookings", "oops");
  const snap = [...storage.map].filter(([k]) => k !== "kajiDemo.bookings");
  const again = open();
  assert.ok(again.getBookings().length >= 4);
  assert.ok(again.getBookings().every((x) => x.status === "paid"));
  assert.ok(again.getDaysOff().some((d) => d.date === FAR));
  assert.equal(again.getPrefs().fontScale, "large");
  assert.equal(again.getPendingId(), "A-1120-1");
  for (const [k, v] of snap) assert.equal(storage.map.get(k), v, `${k} が書き換わった`);
});

test("壊れたキー: prefs だけ壊す → normal に戻り、予約は残る", () => {
  const { store, storage, open } = setup();
  const b = store.addBooking({ staffId: "s1", date: FAR, start: 9, hours: 2, customer });
  storage.map.set("kajiDemo.prefs", "{x");
  const again = open();
  assert.equal(again.getPrefs().fontScale, "normal");
  assert.ok(again.getBookings().some((x) => x.id === b.id));
});

test("壊れたキー: pendingId だけ壊す → null に戻り、予約は残る", () => {
  const { store, storage, open } = setup();
  const b = store.addBooking({ staffId: "s1", date: FAR, start: 9, hours: 2, customer });
  store.setPendingId(b.id);
  storage.map.set("kajiDemo.pendingId", "{x");
  const again = open();
  assert.equal(again.getPendingId(), null);
  assert.ok(again.getBookings().some((x) => x.id === b.id));
});

// ---- 配列の不正な要素は読む時に捨てる ----
test("不正な予約要素は捨てられ、getBookings・addBooking・markPaid・cancelBooking が例外を出さない", () => {
  const { store, storage, open } = setup();
  const good = store.addBooking({ staffId: "s1", date: FAR, start: 9, hours: 2, customer });
  const junk = [
    null, 5, "x", [],
    { date: "2026-10-30", start: 10 },                          // id 無し
    { id: "J-1", start: 10, staffId: "s1", hours: 2 },           // date 無し
    { id: "J-2", date: "2026-10-30", staffId: "s1", hours: 2 },  // start 無し
  ];
  storage.map.set("kajiDemo.bookings", JSON.stringify([...junk, good]));
  const again = open();
  let list;
  assert.doesNotThrow(() => { list = again.getBookings(); });
  assert.deepEqual(list.map((x) => x.id), [good.id]);
  let added;
  assert.doesNotThrow(() => { added = again.addBooking({ staffId: "s3", date: "2026-10-30", start: 12, hours: 2, customer }); });
  assert.equal(added.id, "A-1030-1");
  assert.doesNotThrow(() => again.markPaid(added.id, { sessionId: "cs_test_1" }));
  assert.equal(again.markPaid("J-1"), null);
  assert.doesNotThrow(() => again.cancelBooking("nothing"));
  assert.deepEqual(again.getBookings().map((x) => x.id).sort(), [good.id, added.id].sort());
});

test("不正な予約要素: store の予約を findConflicts に渡しても例外を出さない", () => {
  const { storage, open } = setup();
  storage.map.set("kajiDemo.bookings", JSON.stringify([null, { date: "2026-10-30", start: 10 }]));
  const again = open();
  assert.doesNotThrow(() => findConflicts(again.getBookings(), NOW));
  again.addBooking({ staffId: "s1", date: "2026-10-30", start: 10, hours: 2, customer });
  assert.doesNotThrow(() => findConflicts(again.getBookings(), NOW));
});

test("不正な休み要素は捨てられ、toggleDayOff は例外を出さない", () => {
  const { storage, open } = setup();
  storage.map.set("kajiDemo.daysOff", JSON.stringify([null, 3, { staffId: "s1" }, { date: FAR }, { staffId: "s2", date: FAR }]));
  const again = open();
  assert.deepEqual(again.getDaysOff(), [{ staffId: "s2", date: FAR }]);
  assert.doesNotThrow(() => again.toggleDayOff("s1", FAR));
});

// ---- 書込み例外 ----
test("書込み例外: setItem/removeItem が投げても各メソッドは例外を出さず、同じ store から書いた値が読める", () => {
  const base = fakeStorage();
  const storage = { ...base, setItem() { throw new Error("QuotaExceededError"); }, removeItem() { throw new Error("SecurityError"); } };
  const store = createStore(storage, { now: () => new Date(NOW.getTime()) });
  assert.doesNotThrow(() => store.getStaff());
  assert.equal(store.getStaff().length, 3);
  let b;
  assert.doesNotThrow(() => { b = store.addBooking({ staffId: "s1", date: FAR, start: 9, hours: 2, customer }); });
  assert.equal(b.id, "A-1120-1");
  assert.ok(store.getBookings().some((x) => x.id === b.id));
  assert.doesNotThrow(() => store.setPrefs({ fontScale: "large" }));
  assert.equal(store.getPrefs().fontScale, "large");
  assert.doesNotThrow(() => store.setPendingId(b.id));
  assert.equal(store.getPendingId(), b.id);
  assert.doesNotThrow(() => store.markPaid(b.id, { sessionId: "cs_test_w" }));
  assert.equal(store.getBookings().find((x) => x.id === b.id).status, "paid");
  assert.doesNotThrow(() => store.toggleDayOff("s1", FAR));
  assert.ok(store.getDaysOff().some((d) => d.staffId === "s1" && d.date === FAR));
  assert.doesNotThrow(() => store.clearPendingId());
  assert.equal(store.getPendingId(), null);
  store.setPendingId(b.id);
  assert.doesNotThrow(() => store.reset());
  assert.ok(!store.getBookings().some((x) => x.id === b.id));
  assert.ok(store.getBookings().length >= 4);
  assert.equal(store.getPendingId(), null);
  assert.equal(store.getPrefs().fontScale, "large"); // prefs は reset 後も残る
});

// ---- 予約 id の連番は id の接頭辞 A-MMDD- で数える（補足3。補足2の date 絞りは取り消し） ----
test("連番: 2025-10-30 の A-1030-1 がある状態で 2026-10-30 を追加 → A-1030-2（次は -3、id は重複しない）", () => {
  const { storage, open } = setup();
  const old = { id: "A-1030-1", staffId: "s1", date: "2025-10-30", start: 9, hours: 2, status: "paid", amount: 7000, customer };
  storage.map.set("kajiDemo.bookings", JSON.stringify([old]));
  const again = open();
  const b = again.addBooking({ staffId: "s1", date: "2026-10-30", start: 9, hours: 2, customer });
  assert.equal(b.id, "A-1030-2");
  assert.equal(again.addBooking({ staffId: "s1", date: "2026-10-30", start: 12, hours: 2, customer }).id, "A-1030-3");
  const ids = again.getBookings().map((x) => x.id);
  assert.equal(ids.length, 3);
  assert.equal(new Set(ids).size, 3);
});

test("連番: 接頭辞が違う id（A-1031-5）は数えない", () => {
  const { storage, open } = setup();
  const other = { id: "A-1031-5", staffId: "s1", date: "2026-10-31", start: 9, hours: 2, status: "paid", amount: 7000, customer };
  storage.map.set("kajiDemo.bookings", JSON.stringify([other]));
  const again = open();
  assert.equal(again.addBooking({ staffId: "s1", date: "2026-10-30", start: 9, hours: 2, customer }).id, "A-1030-1");
});

// ---- staff の不正な要素（補足3） ----
test("staff: [null, {id:\"s9\"}, 正しい s1] → s1 だけ残り、slotStatusAny・dayHasOpening が例外を出さない", () => {
  const { store, storage, open } = setup();
  const s1 = store.getStaff().find((s) => s.id === "s1");
  storage.map.set("kajiDemo.staff", JSON.stringify([null, { id: "s9" }, s1]));
  const again = open();
  let list;
  assert.doesNotThrow(() => { list = again.getStaff(); });
  assert.deepEqual(list.map((s) => s.id), ["s1"]);
  const args = { staffList: list, date: FAR, start: 9, hours: 2, bookings: again.getBookings(), daysOff: again.getDaysOff(), now: NOW };
  assert.doesNotThrow(() => slotStatusAny(args));
  assert.doesNotThrow(() => dayHasOpening({ ...args, starts: [9, 10, 11, 12, 13, 14, 15, 16] }));
});

test("staff: 型が不正な要素（id 非文字列・workDays 非数値配列・start/end 非数値）は捨てる", () => {
  const { store, storage, open } = setup();
  const s1 = store.getStaff().find((s) => s.id === "s1");
  const bad = [
    { ...s1, id: 7 },
    { ...s1, id: "b2", workDays: "月" },
    { ...s1, id: "b3", workDays: [1, "2"] },
    { ...s1, id: "b4", start: "9" },
    { ...s1, id: "b5", end: null },
  ];
  storage.map.set("kajiDemo.staff", JSON.stringify([...bad, s1]));
  assert.deepEqual(open().getStaff().map((s) => s.id), ["s1"]);
});

test("staff: 有効な要素が0人（[1,2] や []）ならシードの3名に戻る", () => {
  for (const raw of ["[1,2]", "[]"]) {
    const { storage, open } = setup();
    storage.map.set("kajiDemo.staff", raw);
    assert.deepEqual(open().getStaff().map((s) => s.id), ["s1", "s2", "s3"], raw);
  }
});

// ---- isPersistent（補足3） ----
test("isPersistent: 普通の storage では true（書込み後も）", () => {
  const { store } = setup();
  assert.equal(store.isPersistent(), true);
  store.setPrefs({ fontScale: "large" });
  store.addBooking({ staffId: "s1", date: FAR, start: 9, hours: 2, customer });
  assert.equal(store.isPersistent(), true);
});

test("isPersistent: setItem が投げる storage では、書込みの後 false", () => {
  const base = fakeStorage();
  const storage = { ...base, setItem() { throw new Error("QuotaExceededError"); } };
  const store = createStore(storage, { now: () => new Date(NOW.getTime()) });
  assert.doesNotThrow(() => store.addBooking({ staffId: "s1", date: FAR, start: 9, hours: 2, customer }));
  assert.equal(store.isPersistent(), false);
});

// ---- 返り値は複製（補足3） ----
test("複製: getStaff の結果を書き換えても次の getStaff・別の store に影響しない", () => {
  const { store, open } = setup();
  const first = store.getStaff();
  first[0].name = "改ざん";
  first[0].skills.push("X");
  first[0].workDays.push(99);
  first.pop();
  const second = store.getStaff();
  assert.equal(second.length, 3);
  assert.notEqual(second[0].name, "改ざん");
  assert.ok(!second[0].skills.includes("X"));
  assert.ok(!second[0].workDays.includes(99));
  const other = open().getStaff();
  assert.equal(other.length, 3);
  assert.notEqual(other[0].name, "改ざん");
  assert.ok(!other[0].workDays.includes(99));
  const fresh = createStore(fakeStorage(), { now: () => new Date(NOW.getTime()) }).getStaff();
  assert.notEqual(fresh[0].name, "改ざん");
});

test("複製: getBookings の結果を書き換えても次の getBookings・別の store に影響しない", () => {
  const { store, open } = setup();
  const b = store.addBooking({ staffId: "s1", date: FAR, start: 9, hours: 2, customer: { ...customer } });
  const list = store.getBookings();
  const target = list.find((x) => x.id === b.id);
  target.status = "cancelled";
  target.customer.name = "改ざん";
  list.length = 0;
  const again = store.getBookings();
  assert.ok(again.length >= 5);
  const got = again.find((x) => x.id === b.id);
  assert.equal(got.status, "pending");
  assert.equal(got.customer.name, customer.name);
  const other = open().getBookings().find((x) => x.id === b.id);
  assert.equal(other.status, "pending");
  assert.equal(other.customer.name, customer.name);
});

test("複製: addBooking の返り値を書き換えても保存された予約に影響しない", () => {
  const { store } = setup();
  const b = store.addBooking({ staffId: "s1", date: FAR, start: 9, hours: 2, customer: { ...customer } });
  b.status = "paid";
  b.customer.name = "改ざん";
  const got = store.getBookings().find((x) => x.id === b.id);
  assert.equal(got.status, "pending");
  assert.equal(got.customer.name, customer.name);
});

test("複製: getDaysOff の結果を書き換えても次の getDaysOff・別の store に影響しない", () => {
  const { store, open } = setup();
  store.toggleDayOff("s1", FAR);
  const n = store.getDaysOff().length;
  const list = store.getDaysOff();
  list[0].date = "1999-01-01";
  list.push({ staffId: "s3", date: "1999-01-02" });
  list.length = 0;
  const again = store.getDaysOff();
  assert.equal(again.length, n);
  assert.ok(again.every((d) => d.date !== "1999-01-01" && d.date !== "1999-01-02"));
  const other = open().getDaysOff();
  assert.equal(other.length, n);
  assert.ok(other.every((d) => d.date !== "1999-01-01"));
});

// ---- prefs の不正値 ----
test("prefs: 不正値（未知の文字列・数値・null・欠落・配列・文字列）は normal", () => {
  for (const raw of ['{"fontScale":"huge"}', '{"fontScale":1}', '{"fontScale":null}', "{}", "null", "[]", '"large"']) {
    const { storage, open } = setup();
    storage.map.set("kajiDemo.prefs", raw);
    assert.equal(open().getPrefs().fontScale, "normal", raw);
  }
});

test("prefs: 有効値 large は保たれる", () => {
  const { storage, open } = setup();
  storage.map.set("kajiDemo.prefs", '{"fontScale":"large"}');
  assert.equal(open().getPrefs().fontScale, "large");
});
