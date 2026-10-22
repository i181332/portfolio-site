// 表示用の整形。日付は端末のローカル日付で扱う。
const DOW = ["日", "月", "火", "水", "木", "金", "土"];

const pad = (n) => String(n).padStart(2, "0");
const parse = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export function dateParts(iso) {
  const d = parse(iso);
  return { month: d.getMonth() + 1, day: d.getDate(), dow: DOW[d.getDay()] };
}

export function formatDate(iso) {
  const { month, day, dow } = dateParts(iso);
  return `${month}月${day}日（${dow}）`;
}

export function formatHour(h) {
  return h < 12 ? `午前${h}時` : `午後${h - 12}時`;
}

export function formatRange(start, hours) {
  return `${formatHour(start)}〜${formatHour(start + hours)}`;
}

export function yenParts(n) {
  return { num: n.toLocaleString("en-US"), unit: "円" };
}

export function formatYen(n) {
  const { num, unit } = yenParts(n);
  return num + unit;
}

export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(iso, n) {
  const d = parse(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}
