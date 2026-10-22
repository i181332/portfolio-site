// localStorage を包んだ保存層。storage は getItem/setItem/removeItem を持つもの。
import { CONFIG } from "./config.js";
import { toISODate, addDays } from "./format.js";

const RESET_KEYS = ["staff", "bookings", "daysOff", "pendingId"]; // prefs は残す

const SEED_STAFF = [
  { id: "s1", name: "山本 さち子", intro: "ていねいな掃除と、気持ちのよい片づけを心がけています。", skills: ["掃除機がけ", "台所・水まわり", "お部屋の片づけ"], workDays: [1, 2, 3, 5], start: 9, end: 17 },
  { id: "s2", name: "小林 和美", intro: "台所と水まわりのこびりつき汚れの掃除が得意です。", skills: ["台所・水まわり", "掃除機がけ"], workDays: [2, 4, 6, 0], start: 9, end: 15 },
  { id: "s3", name: "森田 恵", intro: "散らかったお部屋を、使いやすく整えるのが好きです。", skills: ["お部屋の片づけ", "掃除機がけ", "台所・水まわり"], workDays: [1, 3, 4, 5, 6], start: 10, end: 17 },
];

const FONT_SCALES = ["normal", "large"];

const dowOf = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};
// 今日から from〜to 日後の (日付, 担当) のうち、担当が勤務する日
const workingSlots = (today, from, to) => {
  const out = [];
  for (let days = from; days <= to; days++) {
    const date = addDays(today, days);
    for (const s of SEED_STAFF) if (s.workDays.includes(dowOf(date))) out.push({ date, staff: s });
  }
  return out;
};
// 休み：4〜6日後の勤務日から、最初と最後の2件（今日の曜日によらず勤務日になる）
const seedDaysOff = (today) => {
  const c = workingSlots(today, 4, 6);
  return [c[0], c[c.length - 1]].map(({ date, staff }) => ({ staffId: staff.id, date }));
};
// 予約：1〜3日後の担当の勤務日に、勤務時間内（開始は勤務開始の1時間後）で1件ずつ。時間は 2/3/4 を順に
const seedBookings = (today, t) => {
  const counts = {};
  return workingSlots(today, 1, 3).map(({ date, staff }, i) => {
    const hours = CONFIG.hoursOptions[i % CONFIG.hoursOptions.length];
    counts[date] = (counts[date] || 0) + 1;
    return {
      id: idPrefix(date) + counts[date], staffId: staff.id, date, start: staff.start + 1, hours, status: "paid",
      amount: hours * CONFIG.hourlyRate,
      customer: { name: "デモ 利用者", phone: "090-0000-0000", address: "東京都", notes: "" },
      createdAt: t.toISOString(), paidAt: t.toISOString(),
    };
  });
};

// 配列の要素として読める形か（読む時に不正な要素を捨てる）
const isObj = (v) => v != null && typeof v === "object" && !Array.isArray(v);
const VALID = {
  staff: (x) => isObj(x) && typeof x.id === "string",
  bookings: (x) => isObj(x) && typeof x.id === "string" && typeof x.date === "string" && typeof x.start === "number",
  daysOff: (x) => isObj(x) && typeof x.staffId === "string" && typeof x.date === "string",
};

const compareBookings = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.start - b.start);
const idPrefix = (date) => `A-${date.slice(5, 7)}${date.slice(8, 10)}-`;
const nextId = (bookings, date) => {
  const prefix = idPrefix(date);
  const nums = bookings.filter((b) => b.date === date).map((b) => Number(b.id.slice(prefix.length)) || 0);
  return prefix + ((nums.length ? Math.max(...nums) : 0) + 1);
};

export function createStore(storage, { now = () => new Date() } = {}) {
  const key = (name) => CONFIG.storagePrefix + name;
  // 書込みに失敗した値。そのページの間はこちらを優先して読む（null は「消した」）
  const unsaved = new Map();
  const write = (name, value) => {
    try {
      storage.setItem(key(name), JSON.stringify(value));
      unsaved.delete(name);
    } catch {
      unsaved.set(name, value);
    }
  };
  const remove = (name) => {
    try {
      storage.removeItem(key(name));
      unsaved.delete(name);
    } catch {
      unsaved.set(name, null);
    }
  };
  // 無い・読めない値は undefined
  const read = (name) => {
    if (unsaved.has(name)) return unsaved.get(name) ?? undefined;
    try {
      const raw = storage.getItem(key(name));
      return raw == null ? undefined : JSON.parse(raw);
    } catch {
      return undefined;
    }
  };

  const defaults = {
    staff: () => SEED_STAFF,
    bookings: () => seedBookings(toISODate(now()), now()),
    daysOff: () => seedDaysOff(toISODate(now())),
  };

  // 配列のキー。読めなければそのキーだけシードに戻して保存し、不正な要素は捨てる
  function list(name) {
    const v = read(name);
    if (Array.isArray(v)) return v.filter(VALID[name]);
    const seeded = defaults[name]();
    write(name, seeded);
    return seeded;
  }

  function update(id, patch) {
    const bookings = list("bookings");
    const b = bookings.find((x) => x.id === id);
    if (!b) return null;
    Object.assign(b, patch);
    write("bookings", bookings);
    return b;
  }

  const store = {
    getStaff: () => list("staff"),
    getBookings: () => [...list("bookings")].sort(compareBookings),
    addBooking({ staffId, date, start, hours, customer }) {
      const bookings = list("bookings");
      const created = now();
      const booking = {
        id: nextId(bookings, date), staffId, date, start, hours, customer,
        status: "pending", amount: hours * CONFIG.hourlyRate,
        createdAt: created.toISOString(),
        expiresAt: new Date(created.getTime() + CONFIG.pendingMinutes * 60000).toISOString(),
      };
      bookings.push(booking);
      write("bookings", bookings);
      return booking;
    },
    markPaid(id, { sessionId } = {}) {
      const patch = { status: "paid", paidAt: now().toISOString() };
      if (sessionId) patch.sessionId = sessionId;
      return update(id, patch);
    },
    cancelBooking: (id) => update(id, { status: "cancelled" }),
    getDaysOff: () => list("daysOff"),
    toggleDayOff(staffId, date) {
      const off = list("daysOff");
      const i = off.findIndex((o) => o.staffId === staffId && o.date === date);
      if (i >= 0) off.splice(i, 1);
      else off.push({ staffId, date });
      write("daysOff", off);
      return i < 0;
    },
    getPrefs() {
      const p = read("prefs");
      const prefs = { fontScale: "normal", ...(isObj(p) ? p : {}) };
      if (!FONT_SCALES.includes(prefs.fontScale)) prefs.fontScale = "normal";
      return prefs;
    },
    setPrefs: (patch) => write("prefs", { ...store.getPrefs(), ...patch }),
    getPendingId() {
      const v = read("pendingId");
      return typeof v === "string" ? v : null;
    },
    setPendingId: (id) => write("pendingId", id),
    clearPendingId: () => remove("pendingId"),
    reset() {
      for (const name of RESET_KEYS) remove(name);
    },
  };
  return store;
}
