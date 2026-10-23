// 空き時間の計算（デモ用の作り物）。すべて純粋関数。今の時刻は now（Date）で受け取る。
// 日付は "YYYY-MM-DD"、時刻は0時からの分。

import { STAFF } from "./content.js";

const STEP = 30;
const CLEAR_DAYS = 3; // 明日からこの日数は、埋まりを置かない
const pad = (n) => String(n).padStart(2, "0");
const parse = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// 勤務の時刻は「9」（時）でも「540」（分）でも書ける
const toMinutes = (v) => (v <= 24 ? v * 60 : v);

// 区分け（午前〜11:59、午後 12:00〜17:59、夜間 18:00〜）
export const PERIODS = [
  { id: "am", label: "午前", from: 0, to: 12 * 60 },
  { id: "pm", label: "午後", from: 12 * 60, to: 18 * 60 },
  { id: "night", label: "夜間", from: 18 * 60, to: 24 * 60 },
];

// 9:00、13:30（24時間、先頭の0なし）
export const formatTime = (min) => `${Math.floor(min / 60)}:${pad(min % 60)}`;

// 明日から days 日分
export function bookableDates(now, days = 60) {
  const out = [];
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = 0; i < days; i++) {
    d.setDate(d.getDate() + 1);
    out.push(iso(d));
  }
  return out;
}

// その日の勤務（分）。お休みは null
export function workRange(staff, date) {
  if (!staff.workDays.includes(parse(date).getDay())) return null;
  return { start: toMinutes(staff.start), end: toMinutes(staff.end) };
}

// 日付と担当から決まる、埋まっている時間。その担当の勤務の中に、1日に0〜1件（0件が半分ほど）、主に2時間（ときどき3時間）。乱数は使わない
export function fakeBusy(staffId, date) {
  const range = workRange(STAFF.find((s) => s.id === staffId), date);
  if (!range) return [];
  let hash = 7;
  for (const c of `${staffId}/${date}`) hash = (hash * 31 + c.charCodeAt(0)) % 100003;
  if (Math.floor(hash / 5) % 2) return [];
  const length = Math.floor(hash / 11) % 5 === 0 ? 180 : 120;
  const choices = Math.floor((range.end - range.start - length) / STEP) + 1;
  if (choices < 1) return [];
  const start = range.start + STEP * (Math.floor(hash / 17) % choices);
  return [{ start, end: start + length }];
}

const overlaps = (a, b) => a.start < b.end && b.start < a.end;

// 担当1人の、その日に選べる開始時刻
export function openTimes({ staff, date, minutes, booked = [], now }) {
  if (!bookableDates(now).includes(date)) return [];
  const range = workRange(staff, date);
  if (!range) return [];
  const busy = [
    ...(bookableDates(now).indexOf(date) < CLEAR_DAYS ? [] : fakeBusy(staff.id, date)),
    ...booked.filter((b) => b.staffId === staff.id && b.date === date),
  ];
  const out = [];
  for (let start = range.start; start + minutes <= range.end; start += STEP) {
    const slot = { start, end: start + minutes };
    if (!busy.some((b) => overlaps(slot, b))) out.push(start);
  }
  return out;
}

// 指名なし：1人でも空いていれば選べる。staffIds は staffList の並び
export function openTimesAny({ staffList, date, minutes, booked = [], now }) {
  const byStart = new Map();
  for (const staff of staffList) {
    for (const start of openTimes({ staff, date, minutes, booked, now })) {
      byStart.set(start, [...(byStart.get(start) || []), staff.id]);
    }
  }
  return [...byStart].sort((a, b) => a[0] - b[0]).map(([start, staffIds]) => ({ start, staffIds }));
}
