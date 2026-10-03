/* =========================================================
   LIFEFUND PR実績アーカイブ／メディアキット／紹介文集 — レンダリングロジック
   Apps Script（スプレッドシートの受付係）の JSON → HTMLレンダリング
   3ページ共通。ページ内に表示先の要素があるセクションだけを描画する。
   ========================================================= */

// ------- ユーティリティ -------
const $ = (id) => document.getElementById(id);
const setText = (id, v) => { const el = $(id); if (el) el.textContent = v; };
const setHtml = (id, v) => { const el = $(id); if (el) el.innerHTML = v; };
const escapeHtml = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const isTrue = (v) => ["true", "1", "yes", "○", "◯"].includes(String(v ?? "").trim().toLowerCase());

// スプレッドシートに書かれたURLのうち、http(s)・mailto・tel・相対パスだけを通す
function safeUrl(u) {
  const s = String(u ?? "").trim();
  if (!s) return "";
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return "";
  return s;
}

// ------- 変数（variables タブ）-------
// 本文中の {{変数名}} を variables タブの value に差し替える
let VARS = {};
function applyVars(s) {
  return String(s ?? "").replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (m, key) => {
    if (Object.prototype.hasOwnProperty.call(VARS, key)) return VARS[key];
    console.warn(`[variables] 未定義の変数: ${key}`);
    return m;
  });
}
const txt = (s) => escapeHtml(applyVars(s));
const richText = (s) => txt(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

// 受付係（Apps Script）から全タブをまとめて取得。失敗したら null
async function fetchSiteData() {
  if (!DATA_CONFIG.API_URL) return null;
  try {
    const res = await fetch(DATA_CONFIG.API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`status ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[受付係] データ取得失敗。fallback-data.js で表示します:", err);
    return null;
  }
}

const fallbackOf = (key) =>
  (typeof FALLBACK_DATA !== "undefined" && Array.isArray(FALLBACK_DATA[key])) ? structuredClone(FALLBACK_DATA[key]) : [];

// 受付係のデータにそのタブがなければ（空・取得失敗）、fallback-data.js を使う。
// hidden 列が TRUE の行は表示しない。
function rowsOf(remote, key) {
  const rows = (remote && Array.isArray(remote[key]) && remote[key].length) ? remote[key] : fallbackOf(key);
  return rows.filter(r => !isTrue(r.hidden));
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
const byDateDesc = (a, b) => parseDateValue(b.date) - parseDateValue(a.date);

// 「new」フラグ判定（30日以内）
function isNew(s) {
  const t = parseDateValue(s);
  if (!t) return false;
  return (Date.now() - t) < 30 * 24 * 60 * 60 * 1000;
}

// 表示先要素の data-limit 属性があれば、その件数だけ表示する（メディアキットの抜粋表示用）
function limitOf(id) {
  const el = $(id);
  const n = el ? parseInt(el.dataset.limit || "0", 10) : 0;
  return n > 0 ? n : 0;
}
function countLabel(total, limit) {
  return (limit && total > limit) ? `最新 ${limit}件 ／ 全 ${total}件` : `全 ${total}件`;
}

// ------- Googleドライブ素材 -------
// 共有リンク（/file/d/ID/view や ?id=ID）からファイルIDを取り出す
function driveId(url) {
  const s = String(url ?? "");
  const m = s.match(/\/d\/([\w-]{20,})/) || s.match(/[?&]id=([\w-]{20,})/);
  return m ? m[1] : null;
}
// assets/ に置いた素材は、assets/preview/ の軽い版を表示に使う（ロゴのPNGは .png、それ以外は .jpg）
function localPreview(url, type) {
  const m = String(url ?? "").match(/^assets\/([^/]+)\.(png|jpe?g|gif|webp|pdf)$/i);
  if (!m) return "";
  const ext = (String(type || "").toLowerCase() === "logo" && m[2].toLowerCase() === "png") ? "png" : "jpg";
  return `assets/preview/${m[1]}.${ext}`;
}
function assetLinks(url, type) {
  const id = driveId(url);
  if (!id) {
    const u = safeUrl(url);
    const p = localPreview(u, type);
    return { preview: p || u, previewAlt: (p && IMAGE_EXT.test(u)) ? u : "", download: u, view: u, sameOrigin: !/^https?:/i.test(u) };
  }
  return {
    preview: `https://lh3.googleusercontent.com/d/${id}=w1000`,
    previewAlt: `https://drive.google.com/thumbnail?id=${id}&sz=w1000`,
    download: `https://drive.google.com/uc?export=download&id=${id}`,
    view: `https://drive.google.com/file/d/${id}/view`,
    sameOrigin: false,
  };
}
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)(\?|$)/i;

// 画像が読めなかったときは代替URL → ファイル種別のタイル表示の順に切り替える
function wireImageFallbacks(root) {
  root.querySelectorAll("img[data-fallback]").forEach(img => {
    img.addEventListener("error", () => {
      const alt = img.dataset.fallback;
      if (alt && img.src !== alt) { img.dataset.fallback = ""; img.src = alt; return; }
      const tile = document.createElement("div");
      tile.className = "asset-tile";
      tile.textContent = img.dataset.label || "FILE";
      img.replaceWith(tile);
    });
  });
}

// ------- コピー＆トースト -------
function showToast(msg) {
  const toast = $("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}
async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
  if (btn) {
    const span = btn.querySelector("span") || btn;
    const original = span.textContent;
    btn.classList.add("copied");
    span.textContent = "✓ コピー済み";
    setTimeout(() => { btn.classList.remove("copied"); span.textContent = original; }, 2000);
  }
  showToast("紹介文をコピーしました");
}

// ------- レンダラー -------

// プレスリリース
function renderPress(rows) {
  rows.sort(byDateDesc);
  const limit = limitOf("pressTableWrap");
  const list = limit ? rows.slice(0, limit) : rows;
  let html = `<table class="data-table">
    <thead><tr>
      <th style="width:110px">Date</th>
      <th>Title</th>
      <th class="col-link">Link</th>
    </tr></thead><tbody>`;
  let curMonth = "";
  for (const r of list) {
    const ym = getYearMonth(r.date);
    if (ym && ym !== curMonth) {
      const monthCount = list.filter(x => getYearMonth(x.date) === ym).length;
      html += `<tr class="month-sep"><td colspan="3">${escapeHtml(ym)} — ${monthCount}件</td></tr>`;
      curMonth = ym;
    }
    const newBadge = isNew(r.date) ? '<span class="badge-new">NEW</span>' : '';
    const url = safeUrl(r.url);
    html += `<tr>
      <td class="col-date">${escapeHtml(formatDate(r.date))}</td>
      <td class="col-title">${txt(r.title)}${newBadge}</td>
      <td class="col-link">${url ? `<a class="link-arrow" href="${escapeHtml(url)}" target="_blank" rel="noopener">PR TIMES →</a>` : ''}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
  setHtml("pressTableWrap", html);
  setText("pressMetaInline", countLabel(rows.length, limit));
  setText("metaPressCount", `${rows.length}件`);
}

// メディア掲載
function renderMedia(rows) {
  rows.sort(byDateDesc);
  const limit = limitOf("mediaTableWrap");
  const list = limit ? rows.slice(0, limit) : rows;
  let html = `<table class="data-table">
    <thead><tr>
      <th style="width:110px">Date</th>
      <th>Media / Content</th>
      <th style="width:120px">Brand</th>
      <th class="col-link">Link</th>
    </tr></thead><tbody>`;
  for (const r of list) {
    const links = [];
    const u1 = safeUrl(r.url1), u2 = safeUrl(r.url2);
    if (u1) links.push(`<a class="link-arrow" href="${escapeHtml(u1)}" target="_blank" rel="noopener">${escapeHtml(r.label1 || "View")} →</a>`);
    if (u2 && r.label2) links.push(`<a class="link-arrow" href="${escapeHtml(u2)}" target="_blank" rel="noopener">${escapeHtml(r.label2)} →</a>`);
    html += `<tr>
      <td class="col-date">${escapeHtml(formatDate(r.date))}</td>
      <td class="col-title">${txt(r.title)}</td>
      <td class="col-brand">${escapeHtml(r.brand || "")}</td>
      <td class="col-link">${links.join(" ")}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
  setHtml("mediaTableWrap", html);
  setText("mediaMetaInline", countLabel(rows.length, limit));
  setText("metaMediaCount", `${rows.length}件`);
}

// 講演履歴
function renderTalks(rows) {
  rows.sort(byDateDesc);
  const limit = limitOf("talksWrap");
  const list = limit ? rows.slice(0, limit) : rows;
  let html = `<div class="talks-grid">`;
  for (const r of list) {
    const stats = [];
    if (r.attendees) stats.push(`<span><span class="stat-num">${txt(r.attendees)}</span> 参加</span>`);
    if (r.satisfaction) stats.push(`<span><span class="stat-num">${txt(r.satisfaction)}</span> 満足度</span>`);
    const links = [];
    for (const [key, label] of [["video_url", "動画"], ["report_url", "レポート"], ["event_url", "イベント"]]) {
      const u = safeUrl(r[key]);
      if (u) links.push(`<a class="link-arrow" href="${escapeHtml(u)}" target="_blank" rel="noopener">${label} →</a>`);
    }
    html += `<article class="talk-card">
      <div class="talk-date">${escapeHtml(formatDate(r.date))}</div>
      <div class="talk-venue">${txt(r.event || "")}${r.venue ? ' ／ ' + txt(r.venue) : ''}</div>
      <h3 class="talk-title">${txt(r.session || r.theme || "")}</h3>
      ${r.theme && r.session ? `<p class="talk-theme">${txt(r.theme)}</p>` : ''}
      ${stats.length ? `<div class="talk-stats">${stats.join("")}</div>` : ''}
      ${links.length ? `<div class="talk-links">${links.join("")}</div>` : ''}
    </article>`;
  }
  html += `</div>`;
  setHtml("talksWrap", html);
  setText("talksMetaInline", countLabel(rows.length, limit));
  setText("metaTalksCount", `${rows.length}件`);
}

// 受賞歴
function renderAwards(rows) {
  rows.sort(byDateDesc);
  const limit = limitOf("awardsWrap");
  const list = limit ? rows.slice(0, limit) : rows;
  let html = `<div class="awards-timeline">`;
  for (const r of list) {
    const isCrown = isTrue(r.crown);
    const url = safeUrl(r.url);
    html += `<div class="award-item${isCrown ? ' crown' : ''}">
      <div class="award-date">${escapeHtml(formatDate(r.date) || r.date)}</div>
      <div class="award-title">${txt(r.title)}${isCrown ? '<span class="crown-mark">★殿堂入り</span>' : ''}</div>
      <div class="award-detail">${txt(r.detail || "")}${url ? ` <a class="link-arrow" href="${escapeHtml(url)}" target="_blank" rel="noopener">詳細 →</a>` : ''}</div>
    </div>`;
  }
  html += `</div>`;
  setHtml("awardsWrap", html);
  setText("awardsMetaInline", countLabel(rows.length, limit));
}

// ビジョン（未来目標）— 実績と区別して表示
function renderVision(rows) {
  const notice = `<div class="vision-notice">
    <strong>※ 以下は未来目標・ビジョンです。</strong>
    上段の各セクション（プレスリリース・メディア掲載・講演登壇・受賞歴）は<strong>過去〜現在の確定実績</strong>のみを掲載しています。
  </div>`;
  let html = notice + `<div class="vision-grid">`;
  for (const r of rows) {
    let detail = txt(r.detail || "");
    const url = safeUrl(r.url);
    if (url) detail += ` <a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(r.url_label || "詳細")} →</a>`;
    html += `<div class="vision-card">
      ${r.target_year ? `<div class="vision-target">Target ／ ${escapeHtml(r.target_year)}</div>` : ''}
      <div class="vision-name">${txt(r.name)}</div>
      <div class="vision-detail">${detail}</div>
    </div>`;
  }
  html += `</div>`;
  setHtml("visionWrap", html);
}

// PRトピック
function renderTopics(rows) {
  let html = `<div class="topics-grid">`;
  for (const r of rows) {
    let desc = txt(r.detail || "");
    const url = safeUrl(r.url);
    if (url) desc += ` <a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(r.url_label || "詳細")} →</a>`;
    html += `<div class="topic-cell">
      <div class="topic-name">${txt(r.topic)}</div>
      <div class="topic-desc">${desc}</div>
    </div>`;
  }
  html += `</div>`;
  setHtml("topicsWrap", html);
}

// 会社概要（label / value / note / highlight）
// highlight が TRUE の行は、ページ上部の黒い会社概要バーにも表示する
function renderCompany(rows) {
  const bar = rows.filter(r => isTrue(r.highlight));
  if (bar.length) {
    setHtml("companyBarWrap", bar.map(r => {
      const value = txt(r.value).replace(/^([\d.,]+)/, '<span class="num">$1</span>');
      return `<div>
        <div class="company-label">${txt(r.label)}</div>
        <div class="company-value">${value}${r.note ? `<span class="company-note"> ／ ${txt(r.note)}</span>` : ''}</div>
      </div>`;
    }).join(""));
  }
  setHtml("companyTableWrap", `<table class="profile-table"><tbody>${rows.map(r => {
    const value = applyVars(r.value);
    const url = /^https?:\/\//i.test(value) ? safeUrl(value) : "";
    const cell = url ? `<a class="link-arrow" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(value)}</a>` : escapeHtml(value);
    return `<tr><th>${txt(r.label)}</th><td>${cell}${r.note ? `<div class="profile-note">${txt(r.note)}</div>` : ''}</td></tr>`;
  }).join("")}</tbody></table>`);
}

// 問い合わせ先（label / value / type: email・tel・url・text）
function contactLink(r) {
  const v = applyVars(r.value);
  const type = String(r.type || "").toLowerCase();
  if (type === "email") return `<a href="mailto:${escapeHtml(v)}">${escapeHtml(v)}</a>`;
  if (type === "tel") return `<a href="tel:${escapeHtml(v.replace(/[^\d+]/g, ""))}">${escapeHtml(v)}</a>`;
  if (type === "url") {
    const u = safeUrl(v);
    return u ? `<a href="${escapeHtml(u)}" target="_blank" rel="noopener">${escapeHtml(r.link_label || v)}</a>` : escapeHtml(v);
  }
  return escapeHtml(v);
}
function renderContact(rows) {
  setHtml("contactWrap", `<dl class="contact-list">${rows.map(r =>
    `<div><dt>${txt(r.label)}</dt><dd>${contactLink(r)}</dd></div>`).join("")}</dl>`);
  setHtml("footerContact", rows.map(r => {
    const type = String(r.type || "").toLowerCase();
    return (type === "email" || type === "tel" || type === "url") ? contactLink(r) : `<p>${txt(r.value)}</p>`;
  }).join(""));
}

// 代表プロフィール（no / scene / text / source_label / source_url / keywords / featured_on_mediakit）
const SCENE_CLASS = { "メディア": "media", "セミナー": "seminar", "プロフィール": "profile", "講演": "seminar", "正本": "shagai" };
const charCount = (s) => String(s ?? "").replace(/\*\*/g, "").replace(/\s/g, "").length;
function lengthCategory(n) { return n < 180 ? "short" : (n >= 280 ? "long" : "medium"); }
const LENGTH_LABEL = { short: "短文", medium: "中文", long: "長文" };

function renderCeoProfiles(rows, data) {
  rows.sort((a, b) => (parseInt(a.no, 10) || 0) - (parseInt(b.no, 10) || 0));

  // メディアキット：featured_on_mediakit が TRUE の1件（なければ先頭）＋代表写真
  if ($("ceoFeaturedText")) {
    const featured = rows.find(r => isTrue(r.featured_on_mediakit)) || rows[0];
    if (featured) {
      setHtml("ceoFeaturedText", richText(featured.text));
      const btn = $("ceoCopyBtn");
      if (btn) btn.onclick = () => copyText($("ceoFeaturedText").innerText.trim(), btn);
    }
    const photo = (data.assets || []).find(a => /^(photo|写真)$/i.test(String(a.type || "").trim()) && a.url);
    const slot = $("ceoPhoto");
    if (slot && photo) {
      const l = assetLinks(photo.url, "photo");
      slot.innerHTML = `<img src="${escapeHtml(l.preview)}" data-fallback="${escapeHtml(l.previewAlt)}" data-label="PHOTO" alt="${txt(photo.name || "代表写真")}" loading="lazy">`;
      wireImageFallbacks(slot);
    }
  }

  // 紹介文集：全件をカードで表示
  if ($("introGrid")) {
    setHtml("introGrid", rows.map((r, i) => {
      const n = charCount(applyVars(r.text));
      const len = lengthCategory(n);
      const url = safeUrl(r.source_url);
      const source = url
        ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="source-link">${txt(r.source_label || url)}</a>`
        : (r.source_label ? `<span class="source-link" style="border:none;cursor:default;">${txt(r.source_label)}</span>` : "");
      return `<article class="intro-card" data-scene="${escapeHtml(r.scene || "")}" data-length="${len}" data-search="${escapeHtml([r.keywords, r.source_label, r.scene].join(" "))}">
        <div class="card-header">
          <div class="card-meta">
            <span class="card-number">No. ${escapeHtml(String(r.no || i + 1).padStart(2, "0"))}</span>
            ${r.scene ? `<span class="scene-tag ${SCENE_CLASS[r.scene] || ""}">${txt(r.scene)}</span>` : ""}
            <span class="length-tag">${LENGTH_LABEL[len]}</span>
            <span class="char-count">${n}字</span>
          </div>
          <button class="copy-btn"><span>コピーする</span></button>
        </div>
        <div class="card-body">${richText(r.text)}</div>
        ${source ? `<div class="card-footer">${source}</div>` : ""}
      </article>`;
    }).join(""));
    setupArchiveUI(rows);
  }
}

// 紹介文集の検索・フィルタ・コピー
function setupArchiveUI(rows) {
  const scenes = [...new Set(rows.map(r => r.scene).filter(Boolean))];
  const sceneGroup = document.querySelector('[data-filter-type="scene"]');
  if (sceneGroup) {
    sceneGroup.innerHTML = `<button class="filter-btn active" data-filter="all">すべて</button>` +
      scenes.map(s => `<button class="filter-btn" data-filter="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join("");
  }
  setText("totalCount", rows.length);

  const state = { scene: "all", length: "all", keyword: "" };
  const apply = () => {
    let visible = 0;
    document.querySelectorAll(".intro-card").forEach(card => {
      const sceneOk = state.scene === "all" || card.dataset.scene === state.scene;
      const lengthOk = state.length === "all" || card.dataset.length === state.length;
      const hay = (card.dataset.search + " " + card.querySelector(".card-body").innerText).toLowerCase();
      const keywordOk = !state.keyword || hay.includes(state.keyword);
      const show = sceneOk && lengthOk && keywordOk;
      card.classList.toggle("hidden", !show);
      if (show) visible++;
    });
    setText("visibleCount", visible);
    const empty = $("emptyState");
    if (empty) empty.classList.toggle("show", visible === 0);
  };

  document.querySelectorAll(".filter-buttons").forEach(group => {
    const type = group.dataset.filterType;
    group.querySelectorAll(".filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        group.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state[type] = btn.dataset.filter;
        apply();
      });
    });
  });
  const input = $("searchInput");
  if (input) input.addEventListener("input", (e) => { state.keyword = e.target.value.trim().toLowerCase(); apply(); });

  document.querySelectorAll(".intro-card .copy-btn").forEach(btn => {
    btn.addEventListener("click", () => copyText(btn.closest(".intro-card").querySelector(".card-body").innerText.trim(), btn));
  });
  apply();
}

// 代表の関連記事リンク（title / description / url）
function renderCeoLinks(rows) {
  setHtml("relatedList", rows.map(r => {
    const url = safeUrl(r.url);
    return `<li class="related-item">
      <div class="related-item-title">${txt(r.title)}</div>
      ${r.description ? `<p class="related-item-desc">${txt(r.description)}</p>` : ""}
      ${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="related-item-link">${escapeHtml(url)}</a>` : ""}
    </li>`;
  }).join(""));
}

// 事業ブランド（name / category / description / url / url_label）
// URLのあるブランドはフッターの Brands 欄にも並べる
function renderBrands(rows) {
  setHtml("footerBrands", rows.filter(r => safeUrl(r.url)).map(r =>
    `<a href="${escapeHtml(safeUrl(r.url))}" target="_blank" rel="noopener">${txt(r.name)}${r.category ? `（${txt(r.category)}）` : ""}</a>`
  ).join(""));
  setHtml("brandsWrap", `<div class="brands-grid">${rows.map(r => {
    const url = safeUrl(r.url);
    return `<div class="brand-card">
      ${r.category ? `<div class="brand-category">${txt(r.category)}</div>` : ""}
      <div class="brand-name">${txt(r.name)}</div>
      <p class="brand-desc">${txt(r.description || "")}</p>
      ${url ? `<a class="link-arrow" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(r.url_label || "公式サイト")} →</a>` : ""}
    </div>`;
  }).join("")}</div>`);
}

// 取材可能テーマ（theme / detail / url / url_label）
function renderThemes(rows) {
  setHtml("themesWrap", `<ol class="themes-list">${rows.map(r => {
    const url = safeUrl(r.url);
    return `<li class="theme-item">
      <div class="theme-name">${txt(r.theme)}</div>
      <p class="theme-detail">${txt(r.detail || "")}${url ? ` <a class="link-arrow" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(r.url_label || "関連リリース")} →</a>` : ""}</p>
    </li>`;
  }).join("")}</ol>`);
}

// 素材（name / type / url / format / usage_note / background）
const ASSET_TYPE_LABEL = { logo: "ロゴ", photo: "写真", document: "資料" };
function renderAssets(rows) {
  const list = rows.filter(r => r.url);
  if (list.length === 0) {
    setHtml("assetsWrap", `<div class="assets-empty">素材は準備中です。ご入用の際は、下記お問い合わせ先までご連絡ください。</div>`);
    return;
  }
  setHtml("assetsWrap", `<div class="assets-grid">${list.map(r => {
    const type = String(r.type || "").trim().toLowerCase();
    const l = assetLinks(r.url, type);
    const label = (r.format || type || "FILE").toUpperCase();
    const isImage = !!driveId(r.url) || IMAGE_EXT.test(r.url) || !!localPreview(r.url, type) || type === "logo" || type === "photo";
    const thumb = isImage
      ? `<img src="${escapeHtml(l.preview)}" data-fallback="${escapeHtml(l.previewAlt)}" data-label="${escapeHtml(label)}" alt="${txt(r.name)}" loading="lazy">`
      : `<div class="asset-tile">${escapeHtml(label)}</div>`;
    const dark = /^(dark|black|黒)$/i.test(String(r.background || "").trim());
    return `<figure class="asset-card">
      <div class="asset-thumb${dark ? " dark" : ""}">${thumb}</div>
      <figcaption>
        <div class="asset-type">${escapeHtml(ASSET_TYPE_LABEL[type] || r.type || "素材")}${r.format ? ` ／ ${escapeHtml(r.format)}` : ""}</div>
        <div class="asset-name">${txt(r.name)}</div>
        ${r.usage_note ? `<p class="asset-note">${txt(r.usage_note)}</p>` : ""}
        <div class="asset-actions">
          <a class="btn-dl" href="${escapeHtml(l.download)}"${l.sameOrigin ? " download" : ""}>ダウンロード</a>
          <a class="link-arrow" href="${escapeHtml(l.view)}" target="_blank" rel="noopener">原寸で見る →</a>
        </div>
      </figcaption>
    </figure>`;
  }).join("")}</div>`);
  wireImageFallbacks($("assetsWrap"));
}

// 素材利用時の注意事項（note）
function renderUsage(rows) {
  setHtml("usageWrap", `<ol class="usage-list">${rows.map(r => `<li>${txt(r.note)}</li>`).join("")}</ol>`);
}

// エラー表示
function showError(elementId, message) {
  setHtml(elementId, `<div class="error">${escapeHtml(message)}</div>`);
}

// ------- セクション定義 -------
// targets のいずれかがページにあれば、そのタブを読み込んで描画する
const SECTIONS = [
  { key: "press",       render: renderPress,       targets: ["pressTableWrap"] },
  { key: "media",       render: renderMedia,       targets: ["mediaTableWrap"] },
  { key: "talks",       render: renderTalks,       targets: ["talksWrap"] },
  { key: "awards",      render: renderAwards,      targets: ["awardsWrap"] },
  { key: "vision",      render: renderVision,      targets: ["visionWrap"] },
  { key: "topics",      render: renderTopics,      targets: ["topicsWrap"] },
  { key: "company",     render: renderCompany,     targets: ["companyBarWrap", "companyTableWrap"] },
  { key: "contact",     render: renderContact,     targets: ["contactWrap", "footerContact"] },
  { key: "ceoProfiles", render: renderCeoProfiles, targets: ["ceoFeaturedText", "introGrid"], needs: ["assets"] },
  { key: "ceoLinks",    render: renderCeoLinks,    targets: ["relatedList"] },
  { key: "brands",      render: renderBrands,      targets: ["brandsWrap", "footerBrands"] },
  { key: "themes",      render: renderThemes,      targets: ["themesWrap"] },
  { key: "assets",      render: renderAssets,      targets: ["assetsWrap"] },
  { key: "usage",       render: renderUsage,       targets: ["usageWrap"] },
];

// ------- 起動 -------
async function init() {
  const active = SECTIONS.filter(s => s.targets.some(id => $(id)));
  const keys = new Set(["variables"]);
  active.forEach(s => { keys.add(s.key); (s.needs || []).forEach(k => keys.add(k)); });

  const remote = await fetchSiteData();
  const data = {};
  keys.forEach(k => { data[k] = rowsOf(remote, k); });

  VARS = {};
  for (const r of data.variables || []) if (r.key) VARS[r.key] = r.value;

  for (const s of active) {
    try {
      s.render(data[s.key], data);
    } catch (err) {
      console.error(`[${s.key}] 描画エラー:`, err);
      showError(s.targets.find(id => $(id)), `データの表示に失敗しました（${s.key}）。スプレッドシートの列名をご確認ください。`);
    }
  }

  // データ最終更新日（meta タブの last_updated）
  if ($("updatedDate")) {
    let value = (remote && remote.lastUpdated) || "";
    if (!value && typeof FALLBACK_DATA !== "undefined") value = FALLBACK_DATA.lastUpdated || "";
    setText("updatedDate", value ? formatDate(value) : "—");
  }
}

document.addEventListener("DOMContentLoaded", init);
