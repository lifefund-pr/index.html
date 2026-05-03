# 株式会社LIFEFUND メディアキット

> 取材・寄稿・登壇依頼向けプレスリソース。  
> **Googleスプレッドシートを更新するだけでサイトに自動反映されます。**

🌐 公開URL: `https://【あなたのGitHubユーザー名】.github.io/【リポジトリ名】/`

---

## 📝 運用方法（PR担当の方へ）

新しいプレスリリース・メディア掲載・講演などが発生したら、**Googleスプレッドシートに行を追加するだけ**でサイトに反映されます。HTMLの編集は不要です。

### 反映タイミング

スプレッドシートを編集 → **数分以内**にサイトに反映されます（ブラウザのキャッシュをクリアすると即時反映）。

---

## 🚀 初期セットアップ（最初の1回のみ）

### STEP 1. Googleスプレッドシートを準備

1. 新しいGoogleスプレッドシートを作成
2. 下記の **5つのタブ** を作成し、各タブの1行目に **指定のヘッダー** を入力（このREADME末尾の「テンプレート」参照）
   - `press_releases` — プレスリリース
   - `media_coverage` — メディア掲載
   - `speaking` — 講演履歴
   - `awards` — 受賞歴
   - `topics` — PRトピック

### STEP 2. スプレッドシートを「ウェブに公開」

1. ファイル → **共有** → **ウェブに公開**
2. 「リンク」タブで「ドキュメント全体」「ウェブページ」を選択 → **公開**
3. ファイル → 共有 → 共有 → 「リンクを知っている全員 → **閲覧者**」に設定

### STEP 3. ID と GID を `config.js` に貼り付け

1. スプレッドシートのURLからIDを取得  
   `https://docs.google.com/spreadsheets/d/`**ココがID**`/edit`
2. 各タブを開き、URL末尾 `#gid=` の数字を取得（タブごとに異なる）
3. `config.js` を以下のように編集してコミット：

```javascript
const DATA_CONFIG = {
  SHEET_ID: "1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890",  // ← 貼り付け
  TABS: {
    press:  "0",          // press_releasesタブのGID
    media:  "123456789",  // media_coverageタブのGID
    talks:  "987654321",  // speakingタブのGID
    awards: "111222333",  // awardsタブのGID
    topics: "444555666",  // topicsタブのGID
  },
  AUTO_UPDATE_DATE: true,
};
```

### STEP 4. GitHub Pages で公開

1. このリポジトリの **Settings → Pages**
2. Source: `Deploy from a branch` / Branch: `main` / Folder: `/ (root)`
3. 数分後に `https://【ユーザー名】.github.io/【リポジトリ名】/` で公開されます

---

## 📋 スプレッドシートのテンプレート

### タブ1: `press_releases`（プレスリリース）

| date | title | url |
|------|-------|-----|
| 2026-04-09 | 相続の悩み、工務店に持ち込まれる時代に | https://prtimes.jp/... |
| 2026-03-30 | 浜松の工務店からの注意喚起 | https://prtimes.jp/... |

- **date**: `YYYY-MM-DD` 形式（例: `2026-04-09`）。30日以内のものは自動的に「NEW」バッジ表示
- **title**: タイトル
- **url**: PR TIMESのURL

### タブ2: `media_coverage`（メディア掲載）

| date | title | brand | url1 | label1 | url2 | label2 |
|------|-------|-------|------|--------|------|--------|
| 2026-04-07 | 名古屋モザイク最新カタログにARRCH掲載 | ARRCH | https://www.arrch.net/article/p10269/ | ARRCH | | |
| 2026-03-16 | 『施工の神様』にAI活用5ステップが紹介 | ARRCH/PG HOUSE | https://www.arrch.net/... | ARRCH | https://hamamatsu.pg-house.jp/... | PG HOUSE |

- **brand**: ブランド名（複数なら `ARRCH/PG HOUSE`）
- **url1, label1**: 1個目のリンクとラベル（label1 が空の場合は「View」と表示）
- **url2, label2**: 2個目のリンクとラベル（不要なら空欄）

### タブ3: `speaking`（講演履歴 / 新セクション）

| date | event | venue | session | theme | attendees | satisfaction | event_url | video_url | report_url |
|------|-------|-------|---------|-------|-----------|--------------|-----------|-----------|------------|
| 2025-11-21 | Japan Home Show & Building Show 2025 | 東京ビッグサイト | 工務店経営会議2025 登壇セッション | AI駆使の工務店に全国から視線が集中。10年で売上12倍の戦略 | 690名 | — | https://... | https://youtu.be/... | https://prtimes.jp/... |
| 2026-02-02 | JGBA主催セミナー | オンライン | 年間100棟ビルダーになれた理由 | 売上13倍を実現したAI活用術と成長戦略 | — | — | | | https://prtimes.jp/... |
| 2026-03-XX | 建築AI経営研究会 第3回 | 東京・京橋 | パネルディスカッション | 堀江貴文氏と語る建築AI | 120社超 | — | | | https://prtimes.jp/... |

- **event**: イベント名（例: Japan Home Show & Building Show 2025）
- **venue**: 会場（例: 東京ビッグサイト）
- **session**: 登壇セッション名
- **theme**: 登壇テーマ・内容
- **attendees**: 参加者数（例: `690名`）— 空欄可
- **satisfaction**: 満足度（例: `95%`）— 空欄可
- **event_url / video_url / report_url**: それぞれイベント公式・動画・レポートのURL（任意）

### タブ4: `awards`（受賞歴）

| date | title | detail | url | crown |
|------|-------|--------|-----|-------|
| 2026-01-06 | イエタテ 2025年下半期 静岡県西部 — ARRCH 4位 | ARRCHブランド | https://www.arrch.net/article/p8295/ | |
| 2023-12-31 | デザインカーサ「建築家とつくる家」設計数 5年連続日本一 | 殿堂入り | | true |

- **crown**: 殿堂入りなど特別な受賞は `true` と入力すると金色マーカーで強調表示

### タブ5: `topics`（PRトピック）

| topic | detail | url | url_label |
|-------|--------|-----|-----------|
| ホリエモンAI学校 建築校 | 建築業界特化の生成AI教育事業（2025年7月開校）。750社超参加。 | https://kenchiku-ai.com/ | kenchiku-ai.com |
| 建築AI経営研究会 | 2025年11月発足。第3回（2026年3月・東京京橋）は120社超が申込。 | | |

---

## 🛠 ファイル構成

```
.
├── index.html      ← 本体（基本的に編集不要）
├── app.js          ← 動的レンダリング処理（基本的に編集不要）
├── config.js       ← スプレッドシートID設定（初回のみ編集）
└── README.md       ← このファイル
```

## ❓ トラブルシュート

- **「データ取得に失敗しました」と表示される**  
  → スプレッドシートの「ウェブに公開」設定がOFFになっていないか確認。共有設定が「リンクを知っている全員」になっているか確認。

- **新しい行を追加したのに反映されない**  
  → ブラウザのキャッシュです。スーパーリロード（Ctrl+Shift+R / Cmd+Shift+R）で更新されます。  
  → スプレッドシートの「ウェブに公開」内容は、Google側で数分のキャッシュがあります。

- **デザインを修正したい**  
  → `index.html` の `<style>` 内の CSS変数（`:root` 部分）の色を変更すると全体の配色が変わります。

---

© 株式会社LIFEFUND
