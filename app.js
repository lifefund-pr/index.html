/* =========================================================
   LIFEFUND メディアキット — レンダリングロジック
   Googleスプレッドシート（公開CSV）→ HTMLレンダリング
   ========================================================= */

// ------- ユーティリティ -------
const $ = (id) => document.getElementById(id);
const escapeHtml = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// CSVパーサー（カンマ・改行・ダブルクォート対応）
function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", inQuote = false, i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuote) {
      if (c === '"' && text[i+1] === '"') { cell += '"'; i += 2; continue; }
      if (c === '"') { inQuote = false; i++; continue; }
      cell += c; i++; continue;
    }
    if (c === '"') { inQuote = true; i++; continue; }
    if (c === ',') { row.push(cell); cell = ""; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ""; i++; continue; }
    cell += c; i++;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// CSV → オブジェクト配列（1行目をヘッダーとして）
function csvToObjects(text) {
  const rows = parseCSV(text).filter(r => r.some(v => v && v.trim()));
  if (rows.length === 0) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => {
    const o = {};
    headers.forEach((h, idx) => { o[h] = (r[idx] ?? "").trim(); });
    return o;
  });
}

// スプレッドシートからCSV取得
async function fetchSheet(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${DATA_CONFIG.SHEET_ID}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
  return csvToObjects(await res.text());
}

// 日付フォーマット（YYYY-MM-DD or YYYY/MM/DD → 2026.04.09）
function formatDate(s) {
  if (!s) return "";
  const m = s.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (!m) return s;
  return `${m[1]}.${String(m[2]).padStart(2,"0")}.${String(m[3]).padStart(2,"0")}`;
}
function getYearMonth(s) {
  const m = String(s).match(/(\d{4})[-./](\d{1,2})/);
  return m ? `${m[1]}年 ${parseInt(m[2],10)}月` : "";
}
function parseDateValue(s) {
  const m = String(s).match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (!m) return 0;
  return new Date(`${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`).getTime();
}

// 「new」フラグ判定（30日以内）
function isNew(s) {
  const t = parseDateValue(s);
  if (!t) return false;
  return (Date.now() - t) < 30 * 24 * 60 * 60 * 1000;
}

// ------- レンダラー -------

// 01. プレスリリース
function renderPress(rows) {
  rows.sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date));
  let html = `<table class="data-table">
    <thead><tr>
      <th style="width:110px">Date</th>
      <th>Title</th>
      <th class="col-link">Link</th>
    </tr></thead><tbody>`;
  let curMonth = "";
  for (const r of rows) {
    const ym = getYearMonth(r.date);
    if (ym && ym !== curMonth) {
      const monthCount = rows.filter(x => getYearMonth(x.date) === ym).length;
      html += `<tr class="month-sep"><td colspan="3">${escapeHtml(ym)} — ${monthCount}件</td></tr>`;
      curMonth = ym;
    }
    const newBadge = isNew(r.date) ? '<span class="badge-new">NEW</span>' : '';
    html += `<tr>
      <td class="col-date">${escapeHtml(formatDate(r.date))}</td>
      <td class="col-title">${escapeHtml(r.title)}${newBadge}</td>
      <td class="col-link">${r.url ? `<a class="link-arrow" href="${escapeHtml(r.url)}" target="_blank" rel="noopener">PR TIMES →</a>` : ''}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
  $("pressTableWrap").innerHTML = html;
  $("pressMetaInline").textContent = `全 ${rows.length}件`;
  $("metaPressCount").textContent = `${rows.length}件`;
}

// 02. メディア掲載
function renderMedia(rows) {
  rows.sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date));
  let html = `<table class="data-table">
    <thead><tr>
      <th style="width:110px">Date</th>
      <th>Media / Content</th>
      <th style="width:120px">Brand</th>
      <th class="col-link">Link</th>
    </tr></thead><tbody>`;
  for (const r of rows) {
    const links = [];
    if (r.url1 && r.label1) links.push(`<a class="link-arrow" href="${escapeHtml(r.url1)}" target="_blank" rel="noopener">${escapeHtml(r.label1)} →</a>`);
    else if (r.url1) links.push(`<a class="link-arrow" href="${escapeHtml(r.url1)}" target="_blank" rel="noopener">View →</a>`);
    if (r.url2 && r.label2) links.push(`<a class="link-arrow" href="${escapeHtml(r.url2)}" target="_blank" rel="noopener">${escapeHtml(r.label2)} →</a>`);
    html += `<tr>
      <td class="col-date">${escapeHtml(formatDate(r.date))}</td>
      <td class="col-title">${escapeHtml(r.title)}</td>
      <td class="col-brand">${escapeHtml(r.brand || "")}</td>
      <td class="col-link">${links.join(" ")}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
  $("mediaTableWrap").innerHTML = html;
  $("mediaMetaInline").textContent = `全 ${rows.length}件`;
  $("metaMediaCount").textContent = `${rows.length}件`;
}

// 03. 講演履歴
function renderTalks(rows) {
  rows.sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date));
  let html = `<div class="talks-grid">`;
  for (const r of rows) {
    const stats = [];
    if (r.attendees) stats.push(`<span><span class="stat-num">${escapeHtml(r.attendees)}</span> 参加</span>`);
    if (r.satisfaction) stats.push(`<span><span class="stat-num">${escapeHtml(r.satisfaction)}</span> 満足度</span>`);
    const links = [];
    if (r.video_url) links.push(`<a class="link-arrow" href="${escapeHtml(r.video_url)}" target="_blank" rel="noopener">動画 →</a>`);
    if (r.report_url) links.push(`<a class="link-arrow" href="${escapeHtml(r.report_url)}" target="_blank" rel="noopener">レポート →</a>`);
    if (r.event_url) links.push(`<a class="link-arrow" href="${escapeHtml(r.event_url)}" target="_blank" rel="noopener">イベント →</a>`);
    html += `<article class="talk-card">
      <div class="talk-date">${escapeHtml(formatDate(r.date))}</div>
      <div class="talk-venue">${escapeHtml(r.event || "")}${r.venue ? ' ／ ' + escapeHtml(r.venue) : ''}</div>
      <h3 class="talk-title">${escapeHtml(r.session || r.theme || "")}</h3>
      ${r.theme && r.session ? `<p class="talk-theme">${escapeHtml(r.theme)}</p>` : ''}
      ${stats.length ? `<div class="talk-stats">${stats.join("")}</div>` : ''}
      ${links.length ? `<div class="talk-links">${links.join("")}</div>` : ''}
    </article>`;
  }
  html += `</div>`;
  $("talksWrap").innerHTML = html;
  $("talksMetaInline").textContent = `全 ${rows.length}件`;
  $("metaTalksCount").textContent = `${rows.length}件`;
}

// 04. 受賞歴
function renderAwards(rows) {
  rows.sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date));
  let html = `<div class="awards-timeline">`;
  for (const r of rows) {
    const isCrown = (r.crown || "").toLowerCase() === "true" || r.crown === "1";
    html += `<div class="award-item${isCrown ? ' crown' : ''}">
      <div class="award-date">${escapeHtml(formatDate(r.date) || r.date)}</div>
      <div class="award-title">${escapeHtml(r.title)}${isCrown ? '<span class="crown-mark">★殿堂入り</span>' : ''}</div>
      <div class="award-detail">${escapeHtml(r.detail || "")}${r.url ? ` <a class="link-arrow" href="${escapeHtml(r.url)}" target="_blank" rel="noopener">詳細 →</a>` : ''}</div>
    </div>`;
  }
  html += `</div>`;
  $("awardsWrap").innerHTML = html;
  $("awardsMetaInline").textContent = `全 ${rows.length}件`;
}

// 05. PRトピック
function renderTopics(rows) {
  let html = `<div class="topics-grid">`;
  for (const r of rows) {
    let desc = escapeHtml(r.detail || "");
    if (r.url) desc += ` <a href="${escapeHtml(r.url)}" target="_blank" rel="noopener">${escapeHtml(r.url_label || "詳細")} →</a>`;
    html += `<div class="topic-cell">
      <div class="topic-name">${escapeHtml(r.topic)}</div>
      <div class="topic-desc">${desc}</div>
    </div>`;
  }
  html += `</div>`;
  $("topicsWrap").innerHTML = html;
}

// エラー表示
function showError(elementId, message) {
  const el = $(elementId);
  if (el) el.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
}

// ------- 起動 -------
async function init() {
  // 更新日表示
  if (DATA_CONFIG.AUTO_UPDATE_DATE) {
    const d = new Date();
    $("updatedDate").textContent = `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;
  }

  // スプレッドシートIDが未設定の場合 → フォールバックデータで描画
  if (!DATA_CONFIG.SHEET_ID || DATA_CONFIG.SHEET_ID.includes("ここに")) {
    console.info("[LIFEFUND MediaKit] スプレッドシート未設定 → 同梱の初期データで表示中。config.jsにIDを設定すると自動連携が有効になります。");
    if (typeof FALLBACK_DATA !== "undefined") {
      renderPress(structuredClone(FALLBACK_DATA.press));
      renderMedia(structuredClone(FALLBACK_DATA.media));
      renderTalks(structuredClone(FALLBACK_DATA.talks));
      renderAwards(structuredClone(FALLBACK_DATA.awards));
      renderTopics(structuredClone(FALLBACK_DATA.topics));
    }
    return;
  }

  // 並列取得（スプレッドシート優先、失敗時は各セクションごとにフォールバック）
  const tasks = [
    { key: "press",  gid: DATA_CONFIG.TABS.press,  render: renderPress,  errId: "pressTableWrap" },
    { key: "media",  gid: DATA_CONFIG.TABS.media,  render: renderMedia,  errId: "mediaTableWrap" },
    { key: "talks",  gid: DATA_CONFIG.TABS.talks,  render: renderTalks,  errId: "talksWrap" },
    { key: "awards", gid: DATA_CONFIG.TABS.awards, render: renderAwards, errId: "awardsWrap" },
    { key: "topics", gid: DATA_CONFIG.TABS.topics, render: renderTopics, errId: "topicsWrap" },
  ];
  await Promise.all(tasks.map(async (t) => {
    try {
      const rows = await fetchSheet(t.gid);
      if (rows.length === 0) throw new Error("empty sheet");
      t.render(rows);
    } catch (err) {
      console.warn(`[${t.key}] スプレッドシート取得失敗。フォールバック使用:`, err);
      if (typeof FALLBACK_DATA !== "undefined" && FALLBACK_DATA[t.key]) {
        t.render(structuredClone(FALLBACK_DATA[t.key]));
      } else {
        showError(t.errId, `データ取得に失敗しました（${t.key}）。スプレッドシートの公開設定とGIDをご確認ください。`);
      }
    }
  }));
}

document.addEventListener("DOMContentLoaded", init);
