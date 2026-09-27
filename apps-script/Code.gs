/** @OnlyCurrentDoc */
/* =========================================================
   LIFEFUND 公開サイト用「受付係」（Google Apps Script）
   ---------------------------------------------------------
   スプレッドシートは非公開のまま、下の PUBLIC_TABS に書いた
   タブ・列だけを JSON にしてホームページへ渡す。
   ・ここに書いていないタブ／列（source 列など）は外に出ない
   ・hidden 列が TRUE の行は外に出ない
   ▼ 設置場所：スプレッドシートの「拡張機能 → Apps Script」
   ========================================================= */

// タブ名: [サイト側の呼び名, 公開する列]
const PUBLIC_TABS = {
  press_releases:  ["press",       ["date", "title", "url"]],
  media_coverage:  ["media",       ["date", "title", "brand", "url1", "label1", "url2", "label2"]],
  speaking:        ["talks",       ["date", "event", "venue", "session", "theme", "attendees", "satisfaction", "event_url", "video_url", "report_url"]],
  awards:          ["awards",      ["date", "title", "detail", "url", "crown"]],
  vision:          ["vision",      ["target_year", "name", "detail", "url", "url_label"]],
  topics:          ["topics",      ["topic", "detail", "url", "url_label"]],
  variables:       ["variables",   ["key", "value", "updated_at"]],
  company_profile: ["company",     ["label", "value", "note", "highlight"]],
  contact:         ["contact",     ["label", "value", "type", "link_label"]],
  ceo_profiles:    ["ceoProfiles", ["no", "scene", "text", "featured_on_mediakit", "source_label", "source_url", "keywords"]],
  ceo_links:       ["ceoLinks",    ["title", "description", "url"]],
  brands:          ["brands",      ["name", "category", "description", "url", "url_label"]],
  coverage_themes: ["themes",      ["theme", "detail", "url", "url_label"]],
  assets:          ["assets",      ["name", "type", "url", "format", "usage_note", "background"]],
  usage_notes:     ["usage",       ["note"]],
};

const CACHE_SECONDS = 120;

function doGet() {
  const cache = CacheService.getScriptCache();
  let json = cache.get("site-data");
  if (!json) {
    json = JSON.stringify(buildData());
    if (json.length < 90000) cache.put("site-data", json, CACHE_SECONDS);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function buildData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = { generatedAt: new Date().toISOString() };

  for (const [tabName, [key, columns]] of Object.entries(PUBLIC_TABS)) {
    const sheet = ss.getSheetByName(tabName);
    data[key] = sheet ? readRows(sheet, columns) : [];
  }

  // meta タブは last_updated だけを渡す
  const meta = ss.getSheetByName("meta");
  if (meta) {
    const row = readRows(meta, ["key", "value"]).find(r => r.key.toLowerCase() === "last_updated");
    data.lastUpdated = row ? row.value : "";
  }
  return data;
}

function readRows(sheet, columns) {
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];
  const headers = values[0].map(h => String(h).trim());
  const hiddenIdx = headers.indexOf("hidden");
  const idx = columns.map(c => headers.indexOf(c));

  return values.slice(1)
    .filter(r => r.some(v => String(v).trim() !== ""))
    .filter(r => hiddenIdx < 0 || !/^(true|1|yes|○|◯)$/i.test(String(r[hiddenIdx]).trim()))
    .map(r => {
      const o = {};
      columns.forEach((c, i) => { o[c] = idx[i] >= 0 ? String(r[idx[i]]).trim() : ""; });
      return o;
    });
}

// 動作確認用：Apps Script の画面でこの関数を実行すると、渡す内容がログに出る
function testOutput() {
  const data = buildData();
  Object.keys(data).forEach(k => {
    const v = data[k];
    Logger.log(`${k}: ${Array.isArray(v) ? v.length + "行" : v}`);
  });
}
