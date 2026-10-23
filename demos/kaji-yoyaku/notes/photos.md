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

## 家事の場面写真（Pexels。長辺1600px WebP q80。5枚合計 約415KB）

| ファイル | 内容 | 寸法 | 容量 | 撮影者（写真ページで確認） | 元ページ（写真 ID） | 使い道 |
|---|---|---|---|---|---|---|
| assets/work-hero.webp | 明るい木の床・白い壁の居間で女性が掃除機をかける（後方で男性がPC作業。顔は小さい） | 1600x1067 | 175KB | Annushka Ahuja | https://www.pexels.com/photo/a-man-working-from-home-and-a-woman-vacuuming-in-a-living-room-8055189/ (8055189) | トップ最初の画面 |
| assets/work-vacuum.webp | 掃除機を床にかける足元（顔なし。白い靴下、明るい床） | 1600x1067 | 49KB | Tima Miroshnichenko | https://www.pexels.com/photo/a-person-wearing-white-socks-using-a-vacuum-cleaner-on-tile-floor-6197037/ (6197037) | 掃除機がけ |
| assets/work-kitchen.webp | 白い台所の戸棚の取っ手を青い布で拭く手元（縦長、顔なし） | 1067x1600 | 47KB | Liliana Drew | https://www.pexels.com/photo/a-person-wiping-the-handles-of-a-kitchen-cabinet-9462220/ (9462220) | 台所・水まわり |
| assets/work-tidy.webp | 明るい寝室で二人が整える（制服風の服。顔は小さく伏せ気味） | 1600x1067 | 85KB | Liliana Drew | https://www.pexels.com/photo/women-cleaning-the-bedroom-9462341/ (9462341) | 片づけ・整える |
| assets/work-laundry.webp | 物干しの洗濯物をたたむ手元（顔なし。手前はぼけ） | 1600x1067 | 59KB | cottonbro studio | https://www.pexels.com/photo/close-up-shot-of-a-person-folding-clothes-7703662/ (7703662) | 洗濯 |

- ライセンスは全て Pexels License（各ページで「Free」表示を確認）。原本は repo 外（scratchpad の work-raw）。
- 未達: 和室・日本の住まいの写真は見つからず、洋室の居間・寝室・台所。work-family は適した写真が無く未採用（候補2枚は暗い・顔が大きい）。work-tidy は収納というより寝具の整え（ホテル風の服装）。
- 写真に写る人は全て外国のモデルと思われ、スタッフ3名の写真ではない旨に注意。

## 追加（収納の場面）

| ファイル | 内容 | 寸法 | 容量 | 撮影者（写真ページで確認） | 元ページ（写真 ID） | 使い道 | ライセンス |
|---|---|---|---|---|---|---|---|
| assets/work-organize.webp | 明るい白い台所で、後ろ向きの女性が戸棚の棚に保存容器の瓶を並べて収める（顔は写らない。手元と棚が中心） | 1600x1067 | 56KB | RDNE Stock project | https://www.pexels.com/photo/woman-putting-glass-containers-on-a-kitchen-cabinet-8580763/ (8580763) | 片づけ・収納 | Pexels License（ページで「Free」表示を確認） |

- 原本は repo 外（scratchpad の organize-raw）。長辺1600px WebP q80。
- 未達: 衣類を引き出し・収納箱にしまう手元は、該当する写真が無かった（候補は手元なしの衣類の山、倉庫の段ボール、顔が大きい女性）。場面は台所の戸棚で、寝室の work-tidy とは別。
