// 店名・料金・外部の URL などの設定値。画面はここから読む。本制作でお店の値に置き換える。
export const CONFIG = {
  shopName: "高尾の家事手伝い みどり",
  area: "東京都八王子市の高尾周辺", // 画面に出すので中黒は使わない
  hourlyRate: 3500,
  hoursOptions: [2, 3, 4],
  booking: {            // Square 予約の URL。空なら「準備中」のモーダル
    shop: "https://book.squareup.com/appointments/yty8z30rub8b6y/location/L54G6PFCMRTWP", // 店全体（担当を選ぶ所から）
    staff: { s1: "", s2: "", s3: "" }, // 担当を指定した入口。空なら店全体へ
  },
  payment: {            // Stripe のテスト用 Payment Link（2時間 7,000円）。空なら「準備中」のモーダル
    testLink: "https://buy.stripe.com/test_9B67sK0u2cEA5HV3Yd2go00",
  },
  storagePrefix: "kajiDemo.",
};
