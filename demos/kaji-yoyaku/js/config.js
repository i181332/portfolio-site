// 料金・時間・枠・期限などの設定値。画面や判定はここから読む。
export const CONFIG = {
  paymentLinks: { 2: "", 3: "", 4: "" }, // Stripe Payment Link。空ならデモ内のテスト決済画面
  hourlyRate: 3500,
  hoursOptions: [2, 3, 4],
  slotStarts: [9, 10, 11, 12, 13, 14, 15, 16], // 予約画面に並べる開始時刻
  pendingMinutes: 15,
  bookableDays: 14, // 今日から何日分を選べるか
  storagePrefix: "kajiDemo.",
};
