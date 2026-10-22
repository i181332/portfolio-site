# 採用写真一覧（全て Pexels License。商用可・帰属表示は任意だが README に記載する）

| ファイル | 内容 | 寸法 | 容量 | 撮影者（Pexels 表記のファイル名由来） | 元ページ |
|---|---|---|---|---|---|
| assets/tatami-light.webp | 畳と障子に落ちる木漏れ日（縦長） | 1200x2133 | 260KB | Paolo Sanchez | https://www.pexels.com/photo/sunlight-on-traditional-japanese-interior-scene-32911574/ |
| assets/kettle-window.webp | 窓辺の白いホーロー薬缶と花（縦長） | 1100x1650 | 87KB | nida-kurt-5079840 | https://www.pexels.com/photo/cozy-indoor-scene-with-teapot-and-flowers-28571994/ |
| assets/window-green.webp | 窓越しの山の緑とモカポット（縦長） | 1000x1500 | 20KB | leticia-alvares-1805702 | https://www.pexels.com/photo/cup-and-moka-pot-on-window-25542629/ |
| assets/cloth-hand.webp | 布巾を押さえる手元（淡い灰緑の面） | 1200x801 | 38KB | Towfiqu Barbhuiya | https://www.pexels.com/photo/person-holding-gray-and-black-towel-11370616/ |
| assets/kitchen-wood.webp | 木の天板と白い器の整った台所 | 1400x928 | 38KB | Skylar Kang | https://www.pexels.com/photo/kitchen-counter-with-utensils-under-hanging-cupboard-6370035/ |

合計 約 442KB（上限 1.2MB）。原本は repo 外（scratchpad の photos-raw）。

## 注意
- 撮影者名はページ一覧のファイル名から取得。表示名と異なる可能性があり、README 記載前に元ページで確認すること。
- 薬缶・窓辺は洋風の琺瑯。畳の写真は縦長で光の質が非常に滑らかで、生成画像の可能性は未確認。
- cloth-hand は手が写る（顔なし）。window-green はややもやがかかり、画面端の背景向き。
- 「拭き上げた床」「絞った布巾」の直接該当は無し（布巾は手元の写真で代替）。

## スタッフ写真（480x480 WebP q78、顔中心の正方形。3枚合計 約50KB / 上限150KB）

| ファイル | 役 | 内容 | 容量 | 撮影者（元ページで確認） | 元ページ | ライセンス |
|---|---|---|---|---|---|---|
| assets/staff-s1.webp | 山本 さち子 | 銀髪の短髪、正面を向いた穏やかな微笑み。背景は屋外の緑のぼけ | 20KB | Marcus Aurelius | https://www.pexels.com/photo/woman-smiling-at-the-camera-6787568/ | Pexels License |
| assets/staff-s2.webp | 小林 和美 | 肩までの茶髪、カメラに向けた歯の見える笑顔。明るい室内（逆光） | 20KB | Nguyễn Tiến Thịnh | https://www.pexels.com/photo/smiling-woman-relaxing-indoors-with-books-33496099/ | Pexels License |
| assets/staff-s3.webp | 森田 恵 | 黒髪のロング、カメラに向けた柔らかな笑顔。白い台所 | 11KB | ShotPot | https://www.pexels.com/photo/7705670/ | Pexels License |

- 3人は別撮影の別人。明るさは Pillow で平均輝度を合わせた（±12% 以内。顔の加工なし）。
- 原本は repo 外（scratchpad の portraits-raw2）。切り抜き設定は scratchpad の staff2.json。
- 年齢・国籍は見た目による推定。s1 は元説明で「senior」（50代後半〜60代に見える）、s3 は30代後半〜40代に見える。s1 だけ背景が屋外の緑。エプロン姿はなし。
