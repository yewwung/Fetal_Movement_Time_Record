const app = document.querySelector('#app');
const RECORDS_KEY = 'fetal-diary-records-v1';
const SETTINGS_KEY = 'fetal-diary-settings-v1';

const pad = (value) => String(value).padStart(2, '0');
const dateKey = (date) => {
  const value = date instanceof Date ? date : new Date(date);
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
};
const dateFromKey = (value) => new Date(`${value}T12:00:00`);
const addDays = (date, days) => {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
};
const startOfDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};
const formatTime = (date, seconds = true) => {
  const value = date instanceof Date ? date : new Date(date);
  const base = `${pad(value.getHours())}:${pad(value.getMinutes())}`;
  return seconds ? `${base}:${pad(value.getSeconds())}` : base;
};
const formatMonthDay = (date) => `${date.getMonth() + 1}月${date.getDate()}日`;
const formatFullDate = (date) => new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
}).format(date);
const formatShortWeekday = (date) => new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date).replace('星期', '');
const parseTimestamp = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return Date.parse(value);
};
const makeId = () => (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
  ? globalThis.crypto.randomUUID()
  : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const defaultExportFrom = dateKey(addDays(new Date(), -30));
const todayKey = dateKey(new Date());
const state = {
  activeTab: 'home',
  clockMode: 'digital',
  filter: 'week',
  layout: 'compact',
  records: [],
  settings: { dueType: 'lmp', dueDate: '' },
  expandedDays: new Set([todayKey]),
  exportFrom: defaultExportFrom,
  exportTo: todayKey,
  editingId: '',
  editingDate: '',
  editingTime: '',
  now: new Date(),
};

function readStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function persist() {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(state.records));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  } catch {
    showToast('浏览器未允许本地保存');
  }
}

function load() {
  const storedRecords = readStorage(RECORDS_KEY, []);
  state.records = Array.isArray(storedRecords)
    ? storedRecords.map((record) => ({ id: String(record.id || makeId()), timestamp: parseTimestamp(record.timestamp) })).filter((record) => Number.isFinite(record.timestamp))
    : [];
  const storedSettings = readStorage(SETTINGS_KEY, {});
  state.settings = {
    dueType: storedSettings.dueType === 'due' ? 'due' : 'lmp',
    dueDate: typeof storedSettings.dueDate === 'string' ? storedSettings.dueDate : '',
  };
  state.clockMode = storedSettings.clockMode === 'analog' ? 'analog' : 'digital';
  const storedLayout = readStorage('fetal-diary-layout-v1', 'compact');
  state.layout = storedLayout === 'list' ? 'list' : 'compact';
  const storedFilter = readStorage('fetal-diary-filter-v1', 'week');
  state.filter = ['today', 'week', 'all'].includes(storedFilter) ? storedFilter : 'week';
  state.records.sort((a, b) => b.timestamp - a.timestamp);
}

const iconPaths = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  timeline: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  chart: '<path d="M4 19V5M4 19h16"/><path d="m7 15 3-4 3 2 4-6"/>',
  settings: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="m19.4 15 .1.1a2 2 0 0 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4v.2a2 2 0 0 1-4 0v-.2a2 2 0 0 0-3.4-1.4l-.1.1A2 2 0 0 1 3 15.1l.1-.1A2 2 0 0 0 1.7 11.6h-.2a2 2 0 0 1 0-4h.2A2 2 0 0 0 3.1 4.2L3 4.1A2 2 0 0 1 5.8 1.3l.1.1a2 2 0 0 0 3.4-1.4v-.2a2 2 0 0 1 4 0V0a2 2 0 0 0 3.4 1.4l.1-.1A2 2 0 0 1 19.6 4l-.1.1a2 2 0 0 0 1.4 3.4h.2a2 2 0 0 1 0 4h-.2a2 2 0 0 0-1.5 3.5Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pencil: '<path d="m4 16.5-.7 3.7 3.7-.7L18.5 8a2.1 2.1 0 0 0-3-3L4 16.5Z"/><path d="m13.5 6.5 3 3"/>',
  trash: '<path d="M4 7h16M10 11v5M14 11v5M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  phone: '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M10 18h4"/>',
  wave: '<path d="M3 12h3l2-5 4 10 2-5h5"/>',
};
const icon = (name, className = '') => `<span class="icon ${className}" aria-hidden="true"><svg viewBox="0 0 24 24">${iconPaths[name] || ''}</svg></span>`;

function escapeHTML(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function pregnancyInfo() {
  if (!state.settings.dueDate) return null;
  const selected = dateFromKey(state.settings.dueDate);
  const dueDate = state.settings.dueType === 'lmp' ? addDays(selected, 280) : selected;
  const lmp = state.settings.dueType === 'lmp' ? selected : addDays(selected, -280);
  const elapsed = Math.max(0, Math.min(280, Math.floor((startOfDay(new Date()) - startOfDay(lmp)) / 86400000)));
  return { weeks: Math.floor(elapsed / 7), days: elapsed % 7, dueDate };
}

function todayRecords() {
  const today = dateKey(new Date());
  return state.records.filter((record) => dateKey(new Date(record.timestamp)) === today).sort((a, b) => b.timestamp - a.timestamp);
}

function visibleRecords() {
  const now = new Date();
  const current = now.getTime();
  if (state.filter === 'all') return [...state.records].sort((a, b) => b.timestamp - a.timestamp);
  const start = state.filter === 'today' ? startOfDay(now) : startOfDay(addDays(now, -6));
  return state.records.filter((record) => record.timestamp >= start.getTime() && record.timestamp <= current).sort((a, b) => b.timestamp - a.timestamp);
}

function groupedRecords() {
  const groups = new Map();
  visibleRecords().forEach((record) => {
    const key = dateKey(new Date(record.timestamp));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  });
  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([key, records]) => ({ key, date: dateFromKey(key), records }));
}

function dailyStats() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = startOfDay(addDays(today, index - 6));
    return { date, count: state.records.filter((record) => dateKey(new Date(record.timestamp)) === dateKey(date)).length };
  });
}

function hourlyStats() {
  return Array.from({ length: 6 }, (_, index) => {
    const startHour = index * 4;
    const count = state.records.filter((record) => {
      const hour = new Date(record.timestamp).getHours();
      return hour >= startHour && hour < startHour + 4;
    }).length;
    return { startHour, count };
  });
}

function renderHeader(title, note) {
  return `<header class="screen-header"><h1 class="screen-title">${title}</h1><span class="screen-note">${note}</span></header>`;
}

function renderHome() {
  const pregnancy = pregnancyInfo();
  const records = todayRecords();
  const wave = Array.from({ length: 12 }, (_, index) => {
    const count = records.filter((record) => {
      const hour = new Date(record.timestamp).getHours();
      return hour >= index * 2 && hour < index * 2 + 2;
    }).length;
    const height = count ? Math.min(100, 22 + count * 20) : 8;
    return `<span class="wave-track"><span class="wave-bar ${index % 4 === 0 ? 'coral' : ''}" style="height:${height}%"></span></span>`;
  }).join('');
  const recent = records.length
    ? records.slice(0, 3).map((record) => `<button class="recent-row" data-action="edit" data-id="${escapeHTML(record.id)}"><span class="record-dot"></span><span class="recent-time">${formatTime(new Date(record.timestamp))}</span><span class="recent-day">今天</span><span class="recent-edit">修改</span></button>`).join('')
    : '<div class="inline-empty"><span class="pulse-line"></span><span>还没有记录，等待第一次小小的回应。</span></div>';
  const pregnancyMarkup = pregnancy
    ? `<aside class="pregnancy-summary"><span>孕周</span><div class="pregnancy-values"><strong>${pregnancy.weeks}</strong><small>周</small><strong>${pregnancy.days}</strong><small>天</small></div><span class="due-date">预产期 ${formatMonthDay(pregnancy.dueDate)}</span></aside>`
    : '<button class="setup-button" data-action="tab" data-tab="settings">设置孕期</button>';
  return `<section class="screen ${state.activeTab === 'home' ? 'active' : ''}" data-screen="home">
    ${renderHeader('胎动记录', formatFullDate(state.now))}
    <div class="hero-row"><div class="hero-copy"><span class="date-label">${state.now.toLocaleDateString('zh-CN')}</span><span class="hero-title">记录每一次</span><span class="hero-title accent">小小的回应。</span><span class="hero-note">轻轻一点，留下宝宝今天的第 ${records.length + 1} 次动静。</span></div>${pregnancyMarkup}</div>
    <section class="clock-section">
      <div class="clock-toolbar"><span class="section-label">现在</span><div class="segmented-control"><button class="segment ${state.clockMode === 'digital' ? 'selected' : ''}" data-action="clock" data-mode="digital">数字</button><button class="segment ${state.clockMode === 'analog' ? 'selected' : ''}" data-action="clock" data-mode="analog">表盘</button></div></div>
      <div class="clock-display ${state.clockMode === 'analog' ? 'is-analog' : ''}">${state.clockMode === 'digital' ? `<span class="main-time" data-clock-time>${formatTime(state.now, false)}</span><span class="seconds" data-clock-seconds>${formatTime(state.now).slice(-2)}</span>` : `<div class="analog-clock"><span class="clock-number number-12">12</span><span class="clock-number number-3">3</span><span class="clock-number number-6">6</span><span class="clock-number number-9">9</span><span class="clock-hand hour-hand" data-clock-hour></span><span class="clock-hand minute-hand" data-clock-minute></span><span class="clock-hand second-hand" data-clock-second></span><span class="clock-pin"></span></div>`}</div>
      <div class="record-actions"><button class="record-button" data-action="record"><span class="record-plus">${icon('plus')}</span><span class="record-copy"><span>记录胎动</span><small>保存当前时间</small></span></button><div class="today-count"><strong class="count-number">${records.length}</strong><span>今日记录</span></div></div>
    </section>
    <section class="home-summary"><div class="summary-heading"><div><span class="minor-label">TODAY</span><span class="summary-title">今天的节奏</span></div><button class="link-button" data-action="tab" data-tab="stats">看趋势</button></div><div class="wave-chart">${wave}</div><div class="wave-axis"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div></section>
    <section class="recent-section"><div class="summary-heading"><div><span class="minor-label">RECENT</span><span class="summary-title">最近记录</span></div><button class="link-button" data-action="tab" data-tab="records">查看全部</button></div><div class="recent-list">${recent}</div></section>
  </section>`;
}

function renderExportSection() {
  if (state.exportFrom > state.exportTo) state.exportTo = state.exportFrom;
  const from = dateFromKey(state.exportFrom);
  const to = dateFromKey(state.exportTo);
  const count = state.records.filter((record) => record.timestamp >= startOfDay(from).getTime() && record.timestamp < addDays(startOfDay(to), 1).getTime()).length;
  return `<section class="export-section"><div class="section-heading-row"><div><span class="section-title">导出 CSV</span><span class="section-note">选择范围，保存或分享至手机</span></div><span class="export-count">${count} 条</span></div><div class="date-range"><label class="date-picker"><span class="date-caption">从</span><input type="date" data-field="exportFrom" value="${state.exportFrom}" max="${todayKey}" aria-label="导出开始日期"></label><label class="date-picker"><span class="date-caption">至</span><input type="date" data-field="exportTo" value="${state.exportTo}" min="${state.exportFrom}" max="${todayKey}" aria-label="导出结束日期"></label></div><button class="dark-button" data-action="export">${icon('share')}导出并分享 CSV</button></section>`;
}

function renderEditPanel() {
  if (!state.editingId) return '';
  const record = state.records.find((item) => item.id === state.editingId);
  if (!record) return '';
  return `<section class="edit-panel"><div class="edit-panel-heading"><div><span class="section-title">修改记录</span><span class="section-note">${state.editingDate} ${state.editingTime}</span></div><button class="edit-cancel" data-action="cancel-edit">取消</button></div><div class="edit-fields"><label class="edit-picker"><span class="date-caption">日期</span><input type="date" data-field="editingDate" value="${state.editingDate}" max="${todayKey}" aria-label="记录日期"></label><label class="edit-picker"><span class="date-caption">时间</span><input type="time" data-field="editingTime" value="${state.editingTime}" aria-label="记录时间"></label></div><button class="dark-button edit-save-button" data-action="save-edit">保存修改</button></section>`;
}

function renderRecordGroup(group) {
  const isToday = group.key === todayKey;
  const expanded = state.expandedDays.has(group.key);
  const records = expanded ? `<div class="day-records">${group.records.map((record) => `<div class="timeline-row"><span class="timeline-dot"></span><div class="timeline-datetime"><span class="timeline-date">${formatFullDate(new Date(record.timestamp))}</span><strong class="timeline-time">${formatTime(new Date(record.timestamp))}</strong></div><span class="timeline-kind">胎动</span><div class="timeline-actions"><button class="icon-button" data-action="edit" data-id="${escapeHTML(record.id)}" title="修改记录" aria-label="修改记录">${icon('pencil')}</button><button class="icon-button danger" data-action="delete" data-id="${escapeHTML(record.id)}" title="删除记录" aria-label="删除记录">${icon('trash')}</button></div></div>`).join('')}</div>` : '';
  return `<section class="day-group"><button class="day-heading" data-action="toggle-day" data-key="${group.key}"><span class="day-heading-copy">${isToday ? '<span class="day-relative">今天</span>' : ''}<span class="day-date">${formatFullDate(group.date)}</span></span><span class="day-heading-meta"><span>${group.records.length} 次</span><span class="day-toggle">${expanded ? '收起' : '展开'}</span>${icon('chevron')}</span></button>${records}</section>`;
}

function renderRecords() {
  const groups = groupedRecords();
  const visible = visibleRecords();
  const content = groups.length
    ? `<div class="timeline ${state.layout === 'compact' ? 'compact' : ''}">${groups.map(renderRecordGroup).join('')}</div>`
    : state.records.length
      ? `<div class="empty-state"><div class="empty-symbol">${icon('timeline')}</div><strong class="empty-title">这个范围还没有记录</strong><span class="empty-note">切换到“全部”查看更早的胎动记录。</span><button class="outline-button" data-action="filter" data-filter="all">查看全部</button></div>`
      : `<div class="empty-state"><div class="empty-symbol">${icon('wave')}</div><strong class="empty-title">还没有胎动记录</strong><span class="empty-note">回到记录页，点击按钮保存第一条时间。</span><button class="outline-button" data-action="tab" data-tab="home">去记录</button></div>`;
  return `<section class="screen ${state.activeTab === 'records' ? 'active' : ''}" data-screen="records">${renderHeader('时间线', `共 ${state.records.length} 次`)}${renderExportSection()}<div class="records-toolbar"><div><span class="section-title">胎动记录</span><span class="section-note">显示 ${visible.length} / ${state.records.length} 条</span></div><button class="danger-link" data-action="clear" ${state.records.length ? '' : 'disabled'}>${icon('trash')}清空记录</button></div><div class="record-filter-control">${['today', 'week', 'all'].map((filter) => `<button class="record-filter ${state.filter === filter ? 'selected' : ''}" data-action="filter" data-filter="${filter}">${filter === 'today' ? '今天' : filter === 'week' ? '近 7 天' : '全部'}</button>`).join('')}</div><div class="record-layout-control"><span>显示方式</span><button class="layout-option ${state.layout === 'compact' ? 'selected' : ''}" data-action="layout" data-layout="compact">紧凑</button><button class="layout-option ${state.layout === 'list' ? 'selected' : ''}" data-action="layout" data-layout="list">列表</button></div>${renderEditPanel()}${content}</section>`;
}

function renderStats() {
  const daily = dailyStats();
  const hourly = hourlyStats();
  const weeklyCount = daily.reduce((sum, item) => sum + item.count, 0);
  const maxDaily = Math.max(1, ...daily.map((item) => item.count));
  const maxHourly = Math.max(1, ...hourly.map((item) => item.count));
  const active = hourly.reduce((best, item) => item.count > best.count ? item : best, hourly[0]);
  const dailyBars = daily.map((item) => `<div class="bar-column"><span class="bar-value">${item.count || ''}</span><span class="bar-track"><span class="bar-fill ${item.count ? '' : 'empty'}" style="height:${item.count ? Math.max(12, Math.round(item.count / maxDaily * 100)) : 4}%"></span></span><span class="bar-label">${formatShortWeekday(item.date)}</span></div>`).join('');
  const hourlyBars = hourly.map((item) => `<div class="bar-column"><span class="bar-track"><span class="bar-fill ${item.count ? 'sage-fill' : 'empty'}" style="height:${item.count ? Math.max(12, Math.round(item.count / maxHourly * 100)) : 4}%"></span></span><span class="bar-label">${pad(item.startHour)}</span></div>`).join('');
  const insight = weeklyCount ? '节奏正在被记录' : '从今天开始建立节奏';
  const insightNote = weeklyCount ? '保持每天记录，趋势会越来越清晰。' : '每次轻轻点击，都会成为值得回看的线索。';
  return `<section class="screen ${state.activeTab === 'stats' ? 'active' : ''}" data-screen="stats">${renderHeader('趋势', '用一眼看懂最近的节奏。')}<div class="stats-grid"><div class="metric-card"><strong class="metric-number">${state.records.length}</strong><span class="metric-label">总记录</span></div><div class="metric-card sage"><strong class="metric-number">${weeklyCount}</strong><span class="metric-label">近 7 天</span></div></div><section class="chart-section"><div class="section-heading-row"><div><span class="minor-label">DAILY RHYTHM</span><span class="section-title">每日记录</span></div><span class="section-note">近 7 天</span></div><div class="bar-chart">${dailyBars}</div></section><section class="chart-section"><div class="section-heading-row"><div><span class="minor-label">ACTIVE HOURS</span><span class="section-title">一天中的时段</span></div><span class="section-note">每 4 小时</span></div><div class="bar-chart hourly-chart">${hourlyBars}</div><div class="chart-footer"><span class="legend"><span class="legend-dot"></span>柱形越高，记录越多</span><span>${active.count ? `最活跃时段 ${pad(active.startHour)}:00-${pad(active.startHour + 4)}:00` : '记录后显示活跃时段'}</span></div></section><div class="insight-strip"><span class="spark-mark">✦</span><div><strong class="insight-title">${insight}</strong><span class="insight-note">${insightNote}</span></div></div><p class="privacy-note">统计仅基于本机保存的胎动记录，用于回顾趋势，不替代医生的专业判断。</p></section>`;
}

function renderSettings() {
  const pregnancy = pregnancyInfo();
  const minDue = state.settings.dueType === 'due' ? todayKey : '';
  const maxDue = state.settings.dueType === 'lmp' ? todayKey : '';
  return `<section class="screen ${state.activeTab === 'settings' ? 'active' : ''}" data-screen="settings">${renderHeader('设置', '让记录更贴合你的孕期。')}<section class="settings-section"><div class="settings-heading"><span class="settings-mark"></span><div class="settings-heading-copy"><span class="section-title">孕期计算</span><span class="section-note">只在本机保存，不会上传</span></div></div><div class="choice-control"><button class="choice ${state.settings.dueType === 'lmp' ? 'selected' : ''}" data-action="due-type" data-type="lmp">末次月经</button><button class="choice ${state.settings.dueType === 'due' ? 'selected' : ''}" data-action="due-type" data-type="due">预产期</button></div><label class="setting-row"><span class="setting-label"><span>${state.settings.dueType === 'lmp' ? '末次月经日期' : '预产期日期'}</span><small>${state.settings.dueDate ? '点击日期可修改' : '请选择日期'}</small></span><input type="date" data-field="dueDate" value="${state.settings.dueDate}" min="${minDue}" max="${maxDue}" aria-label="${state.settings.dueType === 'lmp' ? '末次月经日期' : '预产期日期'}"></label>${pregnancy ? `<div class="due-summary"><div><span>当前孕周</span><strong class="due-value">${pregnancy.weeks}周${pregnancy.days}天</strong></div><div><span>预产期</span><strong class="due-value">${formatMonthDay(pregnancy.dueDate)}</strong></div></div><button class="clear-date" data-action="clear-due">清除孕期日期</button>` : ''}</section><section class="settings-section"><div class="settings-heading"><span class="settings-mark blue"></span><div class="settings-heading-copy"><span class="section-title">首页时钟</span><span class="section-note">选择你更顺手的显示方式</span></div></div><div class="choice-control"><button class="choice ${state.clockMode === 'digital' ? 'selected' : ''}" data-action="clock" data-mode="digital">数字</button><button class="choice ${state.clockMode === 'analog' ? 'selected' : ''}" data-action="clock" data-mode="analog">表盘</button></div></section><section class="settings-section"><div class="settings-heading"><span class="settings-mark danger"></span><div class="settings-heading-copy"><span class="section-title">数据与隐私</span><span class="section-note">本机离线模式</span></div></div><div class="local-mode"><span class="local-mode-icon">${icon('phone')}</span><div><strong class="local-mode-title">隐私数据不上云</strong><span class="local-mode-note">胎动记录和孕期设置只保存在当前浏览器中，不需要登录、服务器或数据库。</span></div></div><div class="setting-row"><span class="setting-label"><span>当前记录</span><small>清空后无法恢复，请先导出 CSV</small></span><button class="danger-link" data-action="clear" ${state.records.length ? '' : 'disabled'}>${icon('trash')}清空 ${state.records.length} 条</button></div></section><p class="privacy-note">胎动日记仅用于记录与回看，不替代医生的专业判断。如有不适或胎动明显减少，请及时联系医生。</p></section>`;
}

function renderNav() {
  const items = [['home', '记录', 'home'], ['records', '时间线', 'timeline'], ['stats', '趋势', 'chart'], ['settings', '设置', 'settings']];
  return `<nav class="bottom-nav" aria-label="主导航">${items.map(([tab, label, iconName]) => `<button class="nav-item ${state.activeTab === tab ? 'active' : ''}" data-action="tab" data-tab="${tab}">${icon(iconName, 'nav-icon')}<span>${label}</span></button>`).join('')}</nav>`;
}

function render() {
  app.innerHTML = `${renderHome()}${renderRecords()}${renderStats()}${renderSettings()}${renderNav()}<div class="toast" data-toast role="status"></div>`;
  updateClockDOM();
}

function showToast(message) {
  const element = app.querySelector('[data-toast]');
  if (!element) return;
  element.textContent = message;
  element.classList.add('visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => element.classList.remove('visible'), 1800);
}

function updateClockDOM() {
  const previousKey = dateKey(state.now);
  const now = new Date();
  state.now = now;
  const time = app.querySelector('[data-clock-time]');
  const seconds = app.querySelector('[data-clock-seconds]');
  if (time) time.textContent = formatTime(now, false);
  if (seconds) seconds.textContent = formatTime(now).slice(-2);
  const hour = app.querySelector('[data-clock-hour]');
  const minute = app.querySelector('[data-clock-minute]');
  const second = app.querySelector('[data-clock-second]');
  if (hour) hour.style.transform = `translateX(-50%) rotate(${(now.getHours() % 12) * 30 + now.getMinutes() * 0.5}deg)`;
  if (minute) minute.style.transform = `translateX(-50%) rotate(${now.getMinutes() * 6 + now.getSeconds() * 0.1}deg)`;
  if (second) second.style.transform = `translateX(-50%) rotate(${now.getSeconds() * 6}deg)`;
  if (previousKey !== dateKey(now)) render();
}

function recordMovement() {
  state.records.unshift({ id: makeId(), timestamp: Date.now() });
  persist();
  render();
  showToast('已记录这一次胎动');
  if (navigator.vibrate) navigator.vibrate(12);
}

function openEditor(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) return;
  const date = new Date(record.timestamp);
  state.editingId = id;
  state.editingDate = dateKey(date);
  state.editingTime = formatTime(date, false);
  state.activeTab = 'records';
  render();
}

function deleteRecord(id) {
  if (!window.confirm('删除这条记录？\n删除后无法恢复。')) return;
  state.records = state.records.filter((record) => record.id !== id);
  if (state.editingId === id) state.editingId = '';
  persist();
  render();
  showToast('记录已删除');
}

function clearRecords() {
  if (!state.records.length) return;
  if (!window.confirm(`将永久删除 ${state.records.length} 条胎动记录，此操作无法恢复。`)) return;
  state.records = [];
  state.editingId = '';
  persist();
  render();
  showToast('记录已清空');
}

function saveEditedRecord() {
  const record = state.records.find((item) => item.id === state.editingId);
  const timestamp = Date.parse(`${state.editingDate}T${state.editingTime}`);
  if (!record || !Number.isFinite(timestamp)) {
    showToast('请选择有效的日期和时间');
    return;
  }
  if (timestamp > Date.now()) {
    showToast('记录时间不能晚于现在');
    return;
  }
  record.timestamp = timestamp;
  state.records.sort((a, b) => b.timestamp - a.timestamp);
  state.editingId = '';
  persist();
  render();
  showToast('记录时间已修改');
}

async function exportCSV() {
  const start = startOfDay(dateFromKey(state.exportFrom)).getTime();
  const end = addDays(startOfDay(dateFromKey(state.exportTo)), 1).getTime();
  const selected = state.records.filter((record) => record.timestamp >= start && record.timestamp < end).sort((a, b) => a.timestamp - b.timestamp);
  const rows = [['日期', '时间', '时间戳'], ...selected.map((record) => {
    const date = new Date(record.timestamp);
    return [dateKey(date), formatTime(date), date.toISOString()];
  })];
  const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
  const csv = `\uFEFF${rows.map((row) => row.map(quote).join(',')).join('\r\n')}`;
  const fileName = `胎动记录-${state.exportFrom}-${state.exportTo}.csv`;
  const file = new File([csv], fileName, { type: 'text/csv;charset=utf-8' });
  try {
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: '胎动记录 CSV' });
      showToast(`已准备分享 ${selected.length} 条记录`);
      return;
    }
  } catch (error) {
    if (error && error.name === 'AbortError') return;
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(`已导出 ${selected.length} 条记录`);
}

app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (action === 'tab') state.activeTab = target.dataset.tab;
  if (action === 'record') return recordMovement();
  if (action === 'clock') { state.clockMode = target.dataset.mode; state.settings.clockMode = state.clockMode; persist(); }
  if (action === 'filter') { state.filter = target.dataset.filter; localStorage.setItem('fetal-diary-filter-v1', state.filter); }
  if (action === 'layout') { state.layout = target.dataset.layout; localStorage.setItem('fetal-diary-layout-v1', state.layout); }
  if (action === 'toggle-day') { const key = target.dataset.key; state.expandedDays.has(key) ? state.expandedDays.delete(key) : state.expandedDays.add(key); }
  if (action === 'edit') return openEditor(target.dataset.id);
  if (action === 'delete') return deleteRecord(target.dataset.id);
  if (action === 'clear') return clearRecords();
  if (action === 'cancel-edit') state.editingId = '';
  if (action === 'save-edit') return saveEditedRecord();
  if (action === 'due-type') { state.settings.dueType = target.dataset.type; persist(); }
  if (action === 'clear-due') { state.settings.dueDate = ''; persist(); }
  if (action === 'export') return exportCSV();
  render();
});

app.addEventListener('change', (event) => {
  const field = event.target.dataset.field;
  if (!field) return;
  if (field === 'dueDate') state.settings.dueDate = event.target.value;
  if (field === 'exportFrom') { state.exportFrom = event.target.value; if (state.exportTo < state.exportFrom) state.exportTo = state.exportFrom; }
  if (field === 'exportTo') { state.exportTo = event.target.value; if (state.exportFrom > state.exportTo) state.exportFrom = state.exportTo; }
  if (field === 'editingDate') state.editingDate = event.target.value;
  if (field === 'editingTime') state.editingTime = event.target.value;
  persist();
  render();
});

load();
render();
setInterval(() => {
  const oldKey = dateKey(state.now);
  state.now = new Date();
  if (oldKey !== dateKey(state.now)) render();
  else updateClockDOM();
}, 1000);
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
