// 店名・料金・外部の URL などの設定値。画面はここから読む。本制作でお店の値に置き換える。
export const CONFIG = {
  shopName: "高尾の家事手伝い みどり",
  area: "東京都八王子市の高尾周辺", // 画面に出すので中黒は使わない
  hourlyRate: 3500,
  hoursOptions: [2, 3, 4],
  booking: {
    page: "book.html",  // サイトの「予約する」の行き先（サイト内の予約ページ）
    square: "https://book.squareup.com/appointments/yty8z30rub8b6y/location/L54G6PFCMRTWP", // 本物の Square 予約（架空の店）。予約ページの下に小さなリンクで残す
  },
  payment: {            // Stripe のテスト用 Payment Link（コースの時間ごと）。空なら「準備中」のモーダル
    links: {
      2: "https://buy.stripe.com/test_9B67sK0u2cEA5HV3Yd2go00",
      3: "https://buy.stripe.com/test_aFa00igt0cEAdan8et2go01",
      4: "https://buy.stripe.com/test_4gM8wOfoW1ZW7Q3fGV2go02",
    },
  },
  storagePrefix: "kajiDemo.",
};
