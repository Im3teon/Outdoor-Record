const ROUTES_URL = "./data/routes.json";
const STORAGE_KEY = "taiwan-hiking-log-records-v1";
const CATEGORIES = ["百岳", "小百岳", "古道", "自然步道", "郊山"];
const REGIONS = ["北部", "中部", "南部", "東部", "離島"];
const STATUS_OPTIONS = [
  { value: "unplanned", label: "未規劃", icon: "⭕" },
  { value: "wishlist", label: "想去", icon: "🧭" },
  { value: "completed", label: "已完成", icon: "✅" },
  { value: "revisit", label: "想再訪", icon: "🔁" },
];

const state = {
  routes: [],
  records: {},
  filters: {
    search: "",
    category: "all",
    region: "all",
    county: "all",
    status: "all",
  },
  selectedRouteId: null,
};

const els = {
  topStats: document.getElementById("top-stats"),
  categoryProgress: document.getElementById("category-progress"),
  routesContainer: document.getElementById("routes-container"),
  resultCount: document.getElementById("result-count"),
  dataMessage: document.getElementById("data-message"),
  modal: document.getElementById("route-modal"),
  modalContent: document.getElementById("modal-content"),
  template: document.getElementById("visit-form-template"),
  searchInput: document.getElementById("search-input"),
  categoryFilter: document.getElementById("category-filter"),
  regionFilter: document.getElementById("region-filter"),
  countyFilter: document.getElementById("county-filter"),
  statusFilter: document.getElementById("status-filter"),
  clearFilters: document.getElementById("clear-filters"),
  exportBtn: document.getElementById("export-btn"),
  importFile: document.getElementById("import-file"),
  importBtn: document.getElementById("import-btn"),
  clearRecordsBtn: document.getElementById("clear-records-btn"),
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  initStaticFilters();
  bindEvents();
  loadRecords();
  try {
    const response = await fetch(ROUTES_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`讀取 routes.json 失敗：${response.status}`);
    }
    const data = await response.json();
    state.routes = normalizeRoutes(data);
  } catch (error) {
    showMessage(`無法載入固定路線資料：${error.message}`, true);
    state.routes = [];
  }
  updateCountyFilterOptions();
  render();
}

function initStaticFilters() {
  setSelectOptions(els.categoryFilter, [
    { value: "all", label: "全部" },
    ...CATEGORIES.map((item) => ({ value: item, label: item })),
  ]);
  setSelectOptions(els.regionFilter, [
    { value: "all", label: "全部" },
    ...REGIONS.map((item) => ({ value: item, label: item })),
  ]);
  setSelectOptions(els.statusFilter, [
    { value: "all", label: "全部" },
    ...STATUS_OPTIONS.map((item) => ({ value: item.value, label: item.label })),
  ]);
}

function setSelectOptions(select, items) {
  select.innerHTML = items
    .map((item) => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`)
    .join("");
}

function bindEvents() {
  els.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim();
    render();
  });

  ["category", "region", "county", "status"].forEach((name) => {
    const target = els[`${name}Filter`];
    target.addEventListener("change", (event) => {
      state.filters[name] = event.target.value;
      render();
    });
  });

  els.clearFilters.addEventListener("click", () => {
    state.filters = { search: "", category: "all", region: "all", county: "all", status: "all" };
    els.searchInput.value = "";
    els.categoryFilter.value = "all";
    els.regionFilter.value = "all";
    els.countyFilter.value = "all";
    els.statusFilter.value = "all";
    render();
  });

  els.exportBtn.addEventListener("click", exportRecords);
  els.importBtn.addEventListener("click", importRecords);
  els.clearRecordsBtn.addEventListener("click", clearAllRecords);

  els.modal.addEventListener("click", (event) => {
    if (event.target === els.modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && els.modal.open) {
      closeModal();
    }
  });
}

function normalizeRoutes(data) {
  if (!Array.isArray(data)) return [];
  return data
    .filter((item) => item && typeof item === "object" && typeof item.id === "string" && item.id)
    .map((item, index) => ({
      id: item.id,
      name: textOrFallback(item.name, `未命名路線 ${index + 1}`),
      regions: arrayOrEmpty(item.regions),
      counties: arrayOrEmpty(item.counties),
      categories: arrayOrEmpty(item.categories),
      mountains: arrayOrEmpty(item.mountains),
      difficulty: textOrFallback(item.difficulty, "待補"),
      distanceKm: numberOrNull(item.distanceKm),
      elevationGainM: numberOrNull(item.elevationGainM),
      estimatedHours: numberOrNull(item.estimatedHours),
      permitRequired: item.permitRequired === true,
      sourceUrl: typeof item.sourceUrl === "string" ? item.sourceUrl : "",
      notes: typeof item.notes === "string" ? item.notes : "",
      lastVerified: textOrFallback(item.lastVerified, "待補"),
    }));
}

function updateCountyFilterOptions() {
  const set = new Set();
  state.routes.forEach((route) => route.counties.forEach((county) => set.add(county)));
  const items = [{ value: "all", label: "全部" }].concat(
    Array.from(set)
      .sort((a, b) => a.localeCompare(b, "zh-Hant"))
      .map((item) => ({ value: item, label: item }))
  );
  setSelectOptions(els.countyFilter, items);
}

function getRecord(routeId) {
  if (!state.records[routeId]) {
    state.records[routeId] = createRecord(routeId);
  }
  return state.records[routeId];
}

function createRecord(routeId) {
  return { routeId, status: "unplanned", visits: [], updatedAt: new Date().toISOString() };
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state.records = sanitizeRecordCollection(parsed);
  } catch (error) {
    showMessage("讀取 localStorage 失敗，已略過舊資料。", true);
    state.records = {};
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
}

function sanitizeRecordCollection(input) {
  const output = {};
  if (!input || typeof input !== "object") {
    return output;
  }

  Object.values(input).forEach((record) => {
    if (!record || typeof record !== "object" || typeof record.routeId !== "string" || !record.routeId) {
      return;
    }
    const visits = Array.isArray(record.visits)
      ? record.visits
          .filter((visit) => visit && typeof visit === "object")
          .map((visit) => ({
            id: textOrFallback(visit.id, createId("visit")),
            date: textOrFallback(visit.date, currentDateString()),
            weather: typeof visit.weather === "string" ? visit.weather.trim() : "",
            companions: typeof visit.companions === "string" ? visit.companions.trim() : "",
            notes: typeof visit.notes === "string" ? visit.notes.trim() : "",
            photoUrls: Array.isArray(visit.photoUrls)
              ? visit.photoUrls.filter((url) => typeof url === "string" && url.trim())
              : [],
            createdAt: textOrFallback(visit.createdAt, new Date().toISOString()),
          }))
      : [];

    const status = STATUS_OPTIONS.some((item) => item.value === record.status) ? record.status : "unplanned";
    output[record.routeId] = {
      routeId: record.routeId,
      status,
      visits,
      updatedAt: textOrFallback(record.updatedAt, new Date().toISOString()),
    };
  });

  return output;
}

function render() {
  const filtered = filterRoutes();
  renderStats();
  renderRoutes(filtered);
  els.resultCount.textContent = `篩選結果：${filtered.length} / ${state.routes.length} 條路線`;
}

function filterRoutes() {
  const keyword = state.filters.search.toLowerCase();
  return state.routes.filter((route) => {
    const record = getRecord(route.id);
    const searchable = [route.name, route.mountains.join(" "), route.counties.join(" ")].join(" ").toLowerCase();

    if (keyword && !searchable.includes(keyword)) return false;
    if (state.filters.category !== "all" && !route.categories.includes(state.filters.category)) return false;
    if (state.filters.region !== "all" && !route.regions.includes(state.filters.region)) return false;
    if (state.filters.county !== "all" && !route.counties.includes(state.filters.county)) return false;
    if (state.filters.status !== "all" && record.status !== state.filters.status) return false;
    return true;
  });
}

function renderStats() {
  const total = state.routes.length;
  const completedCount = state.routes.filter((route) => isRouteCompleted(route.id)).length;
  const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const top = [
    { label: "總路線數", value: String(total) },
    { label: "已完成路線數", value: String(completedCount) },
    { label: "完成百分比", value: `${completionRate}%` },
  ];

  els.topStats.innerHTML = top
    .map(
      (item) =>
        `<div class="stat-box"><div class="stat-label">${escapeHtml(item.label)}</div><div class="stat-value">${escapeHtml(
          item.value
        )}</div></div>`
    )
    .join("");

  els.categoryProgress.innerHTML = CATEGORIES.map((category) => {
    const totalByCategory = state.routes.filter((route) => route.categories.includes(category)).length;
    const completedByCategory = state.routes.filter(
      (route) => route.categories.includes(category) && isRouteCompleted(route.id)
    ).length;
    const percent = totalByCategory > 0 ? Math.round((completedByCategory / totalByCategory) * 100) : 0;
    return `
      <div class="progress-item">
        <div class="progress-head">
          <strong>${escapeHtml(category)}</strong>
          <span>${completedByCategory} / ${totalByCategory}（${percent}%）</span>
        </div>
        <progress value="${completedByCategory}" max="${Math.max(totalByCategory, 1)}" aria-label="${escapeHtml(
          category
        )}完成進度"></progress>
      </div>`;
  }).join("");
}

function isRouteCompleted(routeId) {
  const record = getRecord(routeId);
  return ["completed", "revisit"].includes(record.status) || record.visits.length > 0;
}

function renderRoutes(routes) {
  if (!routes.length) {
    els.routesContainer.innerHTML = "<p>沒有符合條件的路線。</p>";
    return;
  }

  els.routesContainer.innerHTML = routes
    .map((route) => {
      const record = getRecord(route.id);
      const status = getStatusMeta(record.status);
      const completedVisits = record.visits.length;
      const lastDate = getLastVisitDate(record.visits);
      return `
        <article class="route-card ${isRouteCompleted(route.id) ? "completed" : ""}">
          <div class="route-title-row">
            <h3>${escapeHtml(route.name)}</h3>
            <span class="status-badge" aria-label="目前狀態">${status.icon} ${status.label}</span>
          </div>
          <div class="tags">${route.categories
            .map((item) => `<span class="tag">${escapeHtml(item)}</span>`)
            .join("")}</div>
          <div class="route-meta">縣市：${escapeHtml(route.counties.join("、") || "待補")}</div>
          <div class="route-meta">地區：${escapeHtml(route.regions.join("、") || "待補")}</div>
          <div class="route-meta">難度：${escapeHtml(route.difficulty)}</div>
          <div class="route-meta">距離：${formatValue(route.distanceKm, "km")} ｜爬升：${formatValue(
            route.elevationGainM,
            "m"
          )} ｜預估：${formatValue(route.estimatedHours, "hr")}</div>
          <div class="route-meta">可能需申請：${route.permitRequired ? "是（請再確認規定）" : "否或待查"}</div>
          <div class="route-meta">已完成次數：${completedVisits} ｜最後完成日期：${escapeHtml(lastDate || "尚無")}</div>
          <div class="route-actions">
            <label>
              <span>快速狀態切換</span>
              <select data-action="status" data-route-id="${escapeHtml(route.id)}">
                ${STATUS_OPTIONS.map(
                  (item) =>
                    `<option value="${item.value}" ${item.value === record.status ? "selected" : ""}>${escapeHtml(
                      item.label
                    )}</option>`
                ).join("")}
              </select>
            </label>
            <button type="button" data-action="open-modal" data-route-id="${escapeHtml(route.id)}">查看／新增紀錄</button>
          </div>
        </article>`;
    })
    .join("");

  els.routesContainer.querySelectorAll("[data-action='status']").forEach((node) => {
    node.addEventListener("change", (event) => {
      const routeId = event.target.dataset.routeId;
      setRouteStatus(routeId, event.target.value);
    });
  });

  els.routesContainer.querySelectorAll("[data-action='open-modal']").forEach((node) => {
    node.addEventListener("click", () => openRouteModal(node.dataset.routeId));
  });
}

function setRouteStatus(routeId, status) {
  if (!STATUS_OPTIONS.some((item) => item.value === status)) return;
  const record = getRecord(routeId);
  record.status = status;
  record.updatedAt = new Date().toISOString();
  saveRecords();
  render();
}

function openRouteModal(routeId) {
  const route = state.routes.find((item) => item.id === routeId);
  if (!route) return;
  state.selectedRouteId = routeId;
  renderModal(route);
  els.modal.showModal();
}

function closeModal() {
  state.selectedRouteId = null;
  els.modal.close();
}

function renderModal(route) {
  const record = getRecord(route.id);
  const visitsHtml = record.visits.length
    ? record.visits
        .map(
          (visit) => `
      <article class="visit-item">
        <p><strong>${escapeHtml(visit.date)}</strong> ${escapeHtml(visit.weather || "")}</p>
        <p>同行者：${escapeHtml(visit.companions || "未填")}</p>
        <p>心得：${escapeHtml(visit.notes || "未填")}</p>
        <p>照片：${renderPhotoLinks(visit.photoUrls)}</p>
        <div class="form-actions">
          <button type="button" data-action="edit-visit" data-visit-id="${escapeHtml(visit.id)}">編輯</button>
          <button type="button" class="danger" data-action="delete-visit" data-visit-id="${escapeHtml(visit.id)}">刪除</button>
        </div>
      </article>
    `
        )
        .join("")
    : "<p>尚無造訪紀錄。</p>";

  els.modalContent.innerHTML = `
    <section>
      <h2 id="modal-title">${escapeHtml(route.name)}</h2>
      <p>分類：${escapeHtml(route.categories.join("、") || "待補")}</p>
      <p>山頭：${escapeHtml(route.mountains.join("、") || "待補")}</p>
      <p>縣市 / 區域：${escapeHtml(route.counties.join("、") || "待補")} / ${escapeHtml(
    route.regions.join("、") || "待補"
  )}</p>
      <p>難度：${escapeHtml(route.difficulty)}；距離 ${formatValue(route.distanceKm, "km")}；爬升 ${formatValue(
    route.elevationGainM,
    "m"
  )}；預估 ${formatValue(route.estimatedHours, "hr")}</p>
      <p>可能需申請：${route.permitRequired ? "是（請再自行確認）" : "否或待查"}</p>
      <p>資料備註：${escapeHtml(route.notes || "無")}</p>
      <p>最後資料確認日：${escapeHtml(route.lastVerified)}</p>
      ${route.sourceUrl ? `<p>參考來源：<a href="${escapeHtml(route.sourceUrl)}" target="_blank" rel="noopener">連結</a></p>` : ""}
    </section>
    <section>
      <h3>造訪紀錄</h3>
      ${visitsHtml}
    </section>
    <section id="visit-form-area"></section>
  `;

  const formFragment = els.template.content.cloneNode(true);
  const area = els.modalContent.querySelector("#visit-form-area");
  area.appendChild(formFragment);
  bindModalEvents(route.id);
  resetVisitForm();
}

function bindModalEvents(routeId) {
  const form = document.getElementById("visit-form");
  const cancelBtn = document.getElementById("cancel-edit-btn");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const visitId = document.getElementById("visit-id").value;
    const visit = {
      id: visitId || createId("visit"),
      date: textOrFallback(document.getElementById("visit-date").value, currentDateString()),
      weather: document.getElementById("visit-weather").value.trim(),
      companions: document.getElementById("visit-companions").value.trim(),
      notes: document.getElementById("visit-notes").value.trim(),
      photoUrls: document
        .getElementById("visit-photos")
        .value.split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      createdAt: new Date().toISOString(),
    };

    const record = getRecord(routeId);
    const index = record.visits.findIndex((item) => item.id === visit.id);
    if (index >= 0) {
      record.visits[index] = { ...record.visits[index], ...visit };
    } else {
      record.visits.push(visit);
    }

    record.status = "completed";
    record.updatedAt = new Date().toISOString();
    saveRecords();
    render();
    openRouteModal(routeId);
  });

  cancelBtn.addEventListener("click", resetVisitForm);

  els.modalContent.querySelectorAll("[data-action='edit-visit']").forEach((btn) => {
    btn.addEventListener("click", () => fillVisitForm(routeId, btn.dataset.visitId));
  });

  els.modalContent.querySelectorAll("[data-action='delete-visit']").forEach((btn) => {
    btn.addEventListener("click", () => deleteVisit(routeId, btn.dataset.visitId));
  });
}

function fillVisitForm(routeId, visitId) {
  const record = getRecord(routeId);
  const visit = record.visits.find((item) => item.id === visitId);
  if (!visit) return;
  document.getElementById("visit-id").value = visit.id;
  document.getElementById("visit-date").value = visit.date;
  document.getElementById("visit-weather").value = visit.weather;
  document.getElementById("visit-companions").value = visit.companions;
  document.getElementById("visit-notes").value = visit.notes;
  document.getElementById("visit-photos").value = visit.photoUrls.join("\n");
  document.getElementById("save-visit-btn").textContent = "更新紀錄";
}

function resetVisitForm() {
  const form = document.getElementById("visit-form");
  if (!form) return;
  form.reset();
  document.getElementById("visit-id").value = "";
  document.getElementById("visit-date").value = currentDateString();
  document.getElementById("save-visit-btn").textContent = "新增紀錄";
}

function deleteVisit(routeId, visitId) {
  const confirmed = window.confirm("確定要刪除這筆造訪紀錄嗎？");
  if (!confirmed) return;
  const record = getRecord(routeId);
  record.visits = record.visits.filter((item) => item.id !== visitId);
  record.updatedAt = new Date().toISOString();
  saveRecords();
  render();
  openRouteModal(routeId);
}

function exportRecords() {
  const date = currentDateString();
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    records: state.records,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `taiwan-hiking-log-backup-${date}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showMessage("已匯出 JSON 備份檔。", false);
}

async function importRecords() {
  const file = els.importFile.files[0];
  if (!file) {
    showMessage("請先選擇 JSON 檔案。", true);
    return;
  }

  const mode = document.querySelector("input[name='import-mode']:checked").value;
  const confirmText = mode === "overwrite" ? "覆蓋" : "合併";
  if (!window.confirm(`即將${confirmText}目前紀錄，是否繼續？`)) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const importedRecords = extractImportRecords(parsed);

    if (mode === "overwrite") {
      state.records = importedRecords;
    } else {
      state.records = mergeRecords(state.records, importedRecords);
    }

    saveRecords();
    render();
    showMessage(`匯入成功（模式：${confirmText}）。`, false);
  } catch (error) {
    showMessage(`匯入失敗：${error.message}`, true);
  }
}

function extractImportRecords(parsed) {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("檔案格式錯誤：根節點必須是物件。");
  }
  const candidate = parsed.records ?? parsed;
  const sanitized = sanitizeRecordCollection(candidate);
  if (!Object.keys(sanitized).length && Object.keys(candidate || {}).length) {
    throw new Error("檔案格式錯誤：找不到可用紀錄。請確認 routeId、status、visits 結構。");
  }
  return sanitized;
}

function mergeRecords(current, imported) {
  const merged = sanitizeRecordCollection(current);
  Object.entries(imported).forEach(([routeId, record]) => {
    if (!merged[routeId]) {
      merged[routeId] = record;
      return;
    }

    const base = merged[routeId];
    const visitMap = new Map();
    base.visits.forEach((visit) => visitMap.set(visit.id, visit));
    record.visits.forEach((visit) => visitMap.set(visit.id, visit));

    merged[routeId] = {
      routeId,
      status: record.status || base.status,
      visits: Array.from(visitMap.values()).sort((a, b) => b.date.localeCompare(a.date)),
      updatedAt: [base.updatedAt, record.updatedAt].sort().pop(),
    };
  });
  return merged;
}

function clearAllRecords() {
  if (!window.confirm("這會清除目前瀏覽器所有紀錄，確定要繼續嗎？")) return;
  if (!window.confirm("請再次確認：清除後無法復原（除非你有備份檔）。")) return;
  state.records = {};
  saveRecords();
  render();
  showMessage("已清除本機紀錄。", false);
}

function getStatusMeta(statusValue) {
  return STATUS_OPTIONS.find((item) => item.value === statusValue) || STATUS_OPTIONS[0];
}

function getLastVisitDate(visits) {
  if (!visits.length) return "";
  return visits
    .map((item) => item.date)
    .filter(Boolean)
    .sort()
    .pop();
}

function renderPhotoLinks(urls) {
  if (!urls.length) return "未填";
  return urls
    .map((url) => {
      const safeUrl = escapeHtml(url);
      return `<a href="${safeUrl}" target="_blank" rel="noopener">${safeUrl}</a>`;
    })
    .join("<br />");
}

function formatValue(value, unit) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "待補";
  }
  return `${value} ${unit}`;
}

function showMessage(message, isError) {
  els.dataMessage.textContent = message;
  els.dataMessage.style.color = isError ? "#a83a3a" : "#516251";
}

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}

function currentDateString() {
  return new Date().toISOString().slice(0, 10);
}

function arrayOrEmpty(input) {
  return Array.isArray(input) ? input.filter((item) => typeof item === "string" && item.trim()) : [];
}

function numberOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function textOrFallback(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
