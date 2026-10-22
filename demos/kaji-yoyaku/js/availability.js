// 空き判定。純粋関数だけ。時刻 now は引数で受け取る。
const REASON_ORDER = ["PAST", "DAY_OFF", "OUTSIDE_HOURS", "INSUFFICIENT_TIME", "BOOKED"];

// 全員 × の時に表に出す理由の順（BOOKED、INSUFFICIENT_TIME を先に、残りは判定の優先順）
const ANY_ORDER = ["BOOKED", "INSUFFICIENT_TIME", ...REASON_ORDER];

const localDate = (iso, hour = 0) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, hour, 0);
};

export function bookingState(b, now) {
  if (b.status === "paid" || b.status === "cancelled") return b.status;
  return new Date(b.expiresAt).getTime() > now.getTime() ? "pending" : "expired";
}

export function isBookingActive(b, now) {
  const s = bookingState(b, now);
  return s === "paid" || s === "pending";
}

export function overlaps(a, b) {
  return a.staffId === b.staffId && a.date === b.date
    && a.start < b.start + b.hours && b.start < a.start + a.hours;
}

export function slotStatus({ staff, date, start, hours, bookings, daysOff, now }) {
  const fail = (reason) => ({ ok: false, reason });
  if (localDate(date, start).getTime() <= now.getTime()) return fail("PAST");
  const dayOff = daysOff.some((o) => o.staffId === staff.id && o.date === date);
  if (!staff.workDays.includes(localDate(date).getDay()) || dayOff) return fail("DAY_OFF");
  if (start < staff.start || start >= staff.end) return fail("OUTSIDE_HOURS");
  if (start + hours > staff.end) return fail("INSUFFICIENT_TIME");
  const want = { staffId: staff.id, date, start, hours };
  if (bookings.some((b) => isBookingActive(b, now) && overlaps(b, want))) return fail("BOOKED");
  return { ok: true };
}

export function openStarts({ staff, date, hours, bookings, daysOff, now, starts }) {
  return starts.filter((start) => slotStatus({ staff, date, start, hours, bookings, daysOff, now }).ok);
}

export function assignStaff({ staffList, date, start, hours, bookings, daysOff, now }) {
  const found = staffList.find((staff) => slotStatus({ staff, date, start, hours, bookings, daysOff, now }).ok);
  return found ? found.id : null;
}

export function slotStatusAny({ staffList, date, start, hours, bookings, daysOff, now }) {
  const reasons = [];
  for (const staff of staffList) {
    const r = slotStatus({ staff, date, start, hours, bookings, daysOff, now });
    if (r.ok) return { ok: true, staffId: staff.id };
    reasons.push(r.reason);
  }
  const reason = ANY_ORDER.find((c) => reasons.includes(c)) ?? "DAY_OFF";
  return { ok: false, reason };
}

export function dayHasOpening({ staffList, date, hours, bookings, daysOff, now, starts }) {
  return staffList.some((staff) => openStarts({ staff, date, hours, bookings, daysOff, now, starts }).length > 0);
}

export function findConflicts(bookings, now) {
  const ids = new Set();
  for (const a of bookings) {
    if (a.status !== "paid") continue;
    for (const b of bookings) {
      if (a !== b && isBookingActive(b, now) && overlaps(a, b)) ids.add(a.id);
    }
  }
  return ids;
}
