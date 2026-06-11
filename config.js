/* =========================================================
   LIFEFUND PR実績アーカイブ — データソース設定
   ---------------------------------------------------------
   ▼ 運用方法
   1. Googleスプレッドシートを更新するだけでサイトに自動反映
   2. データ追加時は meta タブの last_updated も忘れずに更新
   ========================================================= */

const DATA_CONFIG = {
  // ▼ スプレッドシートID
  SHEET_ID: "104GnNBlMLd3cVsCYrIhMSCkHRZZGTPY3Yv779X0KHME",

  // ▼ 各タブのGID
  TABS: {
    press:    "0",            // press_releases
    media:    "1944679808",   // media_coverage
    talks:    "2097691115",   // speaking
    awards:   "156401064",    // awards
    topics:   "1540632922",   // topics
    vision:   "8989613",      // vision（未来目標）
    meta:     "502748587",    // meta（最終更新日）
  },
};
