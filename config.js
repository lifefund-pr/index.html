/* =========================================================
   LIFEFUND PR実績アーカイブ／メディアキット／紹介文集 — データソース設定
   ---------------------------------------------------------
   ▼ しくみ
   スプレッドシートは非公開のまま。スプレッドシートに設置した
   Apps Script（apps-script/Code.gs）が、公開してよいタブ・列だけを
   JSON にして渡す。ここにはその Apps Script のURLだけを書く。
   URLが空欄、または取得に失敗したときは fallback-data.js で表示する。
   ========================================================= */

const DATA_CONFIG = {
  // ▼ Apps Script を「ウェブアプリ」としてデプロイしたときのURL（…/exec で終わる）
  API_URL: "https://script.google.com/macros/s/AKfycbzDWtftEeXd8nbH91a7AMQs5OrIPOqkg8oEQUGiqIVcAIbxw9jk4-5PkOiXbF3Zkm8r/exec",
};
