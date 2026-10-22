// 画面に出す中身（スタッフ・メニュー）。本制作でお店の内容に置き換える。
// 写真は素材（本番はご本人）。曜日と時刻は表示用の文字列で持つ（区切りは読点）。
export const STAFF = [
  {
    id: "s1", name: "山本 さち子", photo: "assets/staff-s1.webp",
    intro: "ていねいな掃除と、気持ちのよい片づけを心がけています。",
    skills: ["掃除機がけ", "台所と水まわり", "お部屋の片づけ"],
    days: "月、火、水、金", hours: "午前9時〜午後5時",
  },
  {
    id: "s2", name: "小林 和美", photo: "assets/staff-s2.webp",
    intro: "台所と水まわりのこびりつき汚れの掃除が得意です。",
    skills: ["台所と水まわり", "掃除機がけ"],
    days: "火、木、土、日", hours: "午前9時〜午後3時",
  },
  {
    id: "s3", name: "森田 恵", photo: "assets/staff-s3.webp",
    intro: "散らかったお部屋を、使いやすく整えるのが好きです。",
    skills: ["お部屋の片づけ", "掃除機がけ", "台所と水まわり"],
    days: "月、水、木、金、土", hours: "午前10時〜午後5時",
  },
];

// メニューの並び（ヘッダーとフッターで共通）
export const NAV = [
  { href: "index.html", label: "トップ" },
  { href: "service.html", label: "サービスと料金" },
  { href: "flow.html", label: "ご利用の流れ" },
  { href: "staff.html", label: "スタッフ紹介" },
  { href: "area.html", label: "対応エリア" },
  { href: "faq.html", label: "よくある質問" },
  { href: "contact.html", label: "お問い合わせ" },
];
