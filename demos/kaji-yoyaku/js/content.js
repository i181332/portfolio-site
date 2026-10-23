// 画面に出す中身（できること・スタッフ・メニュー・営業時間）。本制作でお店の内容に置き換える。
// 写真は素材（本番はご本人）。曜日と時刻は表示用の文字列で持つ（区切りは読点）。

// できること（トップとサービス内容で共通）。写真は人が作業している所（notes/photos.md）
export const SERVICES = [
  {
    id: "vacuum", name: "掃除機がけ", photo: "assets/work-hero.webp",
    examples: ["畳、フローリング、じゅうたん", "家具のすき間、部屋の隅", "階段と廊下"],
  },
  {
    id: "kitchen", name: "台所と水まわり", photo: "assets/work-kitchen.webp",
    examples: ["流しとコンロのまわり", "洗い物と器の片づけ", "洗面台、トイレ、お風呂"],
  },
  {
    id: "tidy", name: "お部屋の片づけ", photo: "assets/work-organize.webp",
    examples: ["出したままの物を元の場所へ", "寝具を整える", "捨てる物は必ずお尋ねしてから"],
  },
  {
    id: "laundry", name: "洗濯", photo: "assets/work-laundry.webp",
    examples: ["洗濯機を回して干す", "乾いた物をたたんでしまう", "シーツの取り替え"],
  },
];

export const STAFF = [
  {
    id: "s1", name: "山本 さち子", photo: "assets/staff-s1.webp",
    skills: ["掃除機がけ", "台所と水まわり", "お部屋の片づけ"],
    days: "月、火、水、金", hours: "午前9時〜午後5時",
    workDays: [1, 2, 3, 5], start: 9, end: 17, // 0=日。時。空き時間の計算（slots.js）に使う
    intro: "ていねいな掃除と、気持ちのよい片づけを心がけています。得意なこと：掃除機がけ、台所と水まわり、お部屋の片づけ。（デモ用の架空のスタッフです。写真は素材です）",
  },
  {
    id: "s2", name: "小林 和美", photo: "assets/staff-s2.webp",
    skills: ["台所と水まわり", "掃除機がけ"],
    days: "火、木、土、日", hours: "午前9時〜午後3時",
    workDays: [0, 2, 4, 6], start: 9, end: 15, // 0=日。時。空き時間の計算（slots.js）に使う
    intro: "台所と水まわりのこびりつき汚れの掃除が得意です。得意なこと：台所と水まわり、掃除機がけ。（デモ用の架空のスタッフです。写真は素材です）",
  },
  {
    id: "s3", name: "森田 恵", photo: "assets/staff-s3.webp",
    skills: ["お部屋の片づけ", "掃除機がけ", "台所と水まわり"],
    days: "月、水、木、金、土", hours: "午前10時〜午後5時",
    workDays: [1, 3, 4, 5, 6], start: 10, end: 17, // 0=日。時。空き時間の計算（slots.js）に使う
    intro: "散らかったお部屋を、使いやすく整えるのが好きです。得意なこと：お部屋の片づけ、掃除機がけ、台所と水まわり。（デモ用の架空のスタッフです。写真は素材です）",
  },
];

// 営業時間（スタッフ3人の出勤日と時間を合わせた範囲。日曜は小林さんだけで午後3時まで）。フッター、お問い合わせ、会社概要で共通
export const HOURS = "月〜土 9時〜17時、日 9時〜15時";

// メニューの並び（ヘッダーとフッターで共通）。会社概要などはフッターの LEGAL_LINKS
export const NAV = [
  { href: "index.html", label: "トップ" },
  { href: "service.html", label: "サービス内容" },
  { href: "price.html", label: "料金" },
  { href: "flow.html", label: "ご利用の流れ" },
  { href: "staff.html", label: "スタッフ紹介" },
  { href: "area.html", label: "対応エリア" },
  { href: "faq.html", label: "よくある質問" },
  { href: "contact.html", label: "お問い合わせ" },
];

export const LEGAL_LINKS = [
  { href: "company.html", label: "会社概要" },
  { href: "law.html", label: "特定商取引法に基づく表記" },
  { href: "privacy.html", label: "プライバシーポリシー" },
];
