const {
  addDays,
  calculatePregnancy,
  combineDateTime,
  dateKey,
  formatFullDate,
  formatMonthDay,
  formatTime,
  parseDate,
  weekdayName,
} = require('../../utils/date');
const { cloudEnvId: CLOUD_ENV_ID } = require('../../config');

const RECORDS_KEY = 'fetal-diary-records-v1';
const SETTINGS_KEY = 'fetal-diary-settings-v1';
const LOGIN_KEY = 'fetal-diary-login-v1';
const DEFAULT_SETTINGS = {
  clockMode: 'digital',
  dueType: 'lmp',
  dueDate: '',
};

const safeRead = (key, fallback) => {
  try {
    const value = wx.getStorageSync(key);
    return value || fallback;
  } catch (error) {
    return fallback;
  }
};

const quoteCsv = (value) => `"${String(value).replace(/"/g, '""')}"`;

const maskPhone = (phoneNumber) => {
  const value = String(phoneNumber || '');
  return /^\d{11}$/.test(value) ? `${value.slice(0, 3)}****${value.slice(-4)}` : '手机号已认证';
};

Page({
  data: {
    activeTab: 'home',
    clockMode: 'digital',
    timeText: '--:--',
    secondText: '--',
    dateLabel: '',
    hourAngle: 0,
    minuteAngle: 0,
    secondAngle: 0,
    todayDate: '',
    records: [],
    todayCount: 0,
    nextCount: 1,
    totalCount: 0,
    weeklyCount: 0,
    recentRecords: [],
    groupedRecords: [],
    dailyStats: [],
    hourlyStats: [],
    todayWave: [],
    mostActiveText: '记录后显示活跃时段',
    recordFilter: 'week',
    recordLayout: 'compact',
    visibleCount: 0,
    collapsedDays: {},
    exportFrom: '',
    exportTo: '',
    exportCount: 0,
    editingId: '',
    editingDate: '',
    editingTime: '',
    editingLabel: '',
    phoneAuthConfigured: Boolean(CLOUD_ENV_ID),
    phoneLoginBusy: false,
    loginState: 'local',
    phoneMasked: '',
    settings: { ...DEFAULT_SETTINGS },
    dueInfo: null,
  },

  onLoad() {
    const now = new Date();
    const storedRecords = safeRead(RECORDS_KEY, []);
    const storedSettings = { ...DEFAULT_SETTINGS, ...safeRead(SETTINGS_KEY, {}) };
    const storedLogin = safeRead(LOGIN_KEY, {});
    this.setData({
      records: Array.isArray(storedRecords) ? storedRecords : [],
      settings: storedSettings,
      clockMode: storedSettings.clockMode || 'digital',
      todayDate: dateKey(now),
      loginState: storedLogin.loginState === 'phone' ? 'phone' : 'local',
      phoneMasked: storedLogin.phoneMasked || '',
      exportFrom: dateKey(addDays(now, -30)),
      exportTo: dateKey(now),
    });
    this.refreshDerived();
    this.updateClock();
  },

  onShow() {
    this.startClock();
  },

  onHide() {
    this.stopClock();
  },

  onUnload() {
    this.stopClock();
  },

  startClock() {
    this.stopClock();
    this.updateClock();
    this.clockTimer = setInterval(() => this.updateClock(), 1000);
  },

  stopClock() {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
  },

  updateClock() {
    const now = new Date();
    const currentDate = dateKey(now);
    if (currentDate !== this.data.todayDate) {
      this.setData({ todayDate: currentDate });
      this.refreshDerived(this.data.records);
    }
    this.setData({
      timeText: formatTime(now, false),
      secondText: formatTime(now).slice(-2),
      dateLabel: `${formatMonthDay(now)} ${weekdayName(now)}`,
      hourAngle: (now.getHours() % 12) * 30 + now.getMinutes() * 0.5,
      minuteAngle: now.getMinutes() * 6 + now.getSeconds() * 0.1,
      secondAngle: now.getSeconds() * 6,
    });
  },

  switchTab(event) {
    this.setData({ activeTab: event.currentTarget.dataset.tab });
  },

  setRecordFilter(event) {
    const recordFilter = event.currentTarget.dataset.filter;
    if (!['today', 'week', 'all'].includes(recordFilter)) return;
    this.setData({ recordFilter });
    this.refreshRecordGroups(this.data.records, recordFilter, this.data.collapsedDays);
  },

  setRecordLayout(event) {
    const recordLayout = event.currentTarget.dataset.layout;
    if (!['compact', 'list'].includes(recordLayout)) return;
    this.setData({ recordLayout });
  },

  toggleDayGroup(event) {
    const key = event.currentTarget.dataset.key;
    if (!key) return;
    const collapsedDays = { ...this.data.collapsedDays, [key]: !this.data.collapsedDays[key] };
    this.setData({ collapsedDays });
    this.refreshRecordGroups(this.data.records, this.data.recordFilter, collapsedDays);
  },

  openRecordEditor(event) {
    this.setData({ activeTab: 'records' });
    this.startEditRecord(event);
  },

  setClockMode(event) {
    const clockMode = event.currentTarget.dataset.mode;
    const settings = { ...this.data.settings, clockMode };
    this.setData({ clockMode, settings });
    this.persistSettings(settings);
  },

  recordMovement() {
    const timestamp = Date.now();
    const record = {
      id: `${timestamp}_${Math.random().toString(16).slice(2, 8)}`,
      timestamp,
    };
    const storedRecords = safeRead(RECORDS_KEY, null);
    const currentRecords = Array.isArray(storedRecords) ? storedRecords : this.data.records;
    const records = [record, ...currentRecords];
    this.setData({ records });
    this.persistRecords(records);
    this.refreshDerived(records);
    wx.vibrateShort({ type: 'light' });
    wx.showToast({ title: '已记录这一刻', icon: 'success', duration: 1400 });
  },

  deleteRecord(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: '删除这条记录？',
      content: '删除后无法恢复。',
      confirmText: '删除',
      confirmColor: '#d95643',
      success: ({ confirm }) => {
        if (!confirm) return;
        const records = this.data.records.filter((item) => item.id !== id);
        this.setData({ records });
        if (this.data.editingId === id) this.cancelEditRecord();
        this.persistRecords(records);
        this.refreshDerived(records);
        wx.showToast({ title: '已删除', icon: 'none' });
      },
    });
  },

  startEditRecord(event) {
    const id = event.currentTarget.dataset.id;
    const record = this.data.records.find((item) => item.id === id);
    if (!record) return;
    const timestamp = Number(record.timestamp);
    this.setData({
      editingId: id,
      editingDate: dateKey(timestamp),
      editingTime: formatTime(timestamp, false),
      editingLabel: `${formatMonthDay(timestamp)} ${formatTime(timestamp)}`,
    });
  },

  cancelEditRecord() {
    this.setData({ editingId: '', editingDate: '', editingTime: '', editingLabel: '' });
  },

  onEditDateChange(event) {
    const editingDate = event.detail.value;
    this.setData({
      editingDate,
      editingLabel: `${formatMonthDay(editingDate)} ${this.data.editingTime}`,
    });
  },

  onEditTimeChange(event) {
    const editingTime = event.detail.value;
    this.setData({
      editingTime,
      editingLabel: `${formatMonthDay(this.data.editingDate)} ${editingTime}`,
    });
  },

  saveEditRecord() {
    if (!this.data.editingId) return;
    const date = combineDateTime(this.data.editingDate, this.data.editingTime);
    if (!date) {
      wx.showToast({ title: '请选择有效的日期和时间', icon: 'none' });
      return;
    }
    const timestamp = date.getTime();
    if (timestamp > Date.now()) {
      wx.showToast({ title: '记录时间不能晚于现在', icon: 'none' });
      return;
    }
    const records = this.data.records.map((item) => item.id === this.data.editingId ? { ...item, timestamp } : item);
    this.persistRecords(records);
    this.setData({ records });
    this.cancelEditRecord();
    this.refreshDerived(records);
    wx.showToast({ title: '记录时间已修改', icon: 'success' });
  },

  clearAllRecords() {
    if (!this.data.records.length) {
      wx.showToast({ title: '当前没有记录', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '清空全部记录？',
      content: `将永久删除 ${this.data.records.length} 条胎动记录，此操作无法恢复。`,
      confirmText: '全部清空',
      cancelText: '取消',
      confirmColor: '#d95643',
      success: ({ confirm }) => {
        if (!confirm) return;
        // Write an empty array instead of only removing the key so a quick next tap
        // cannot reuse a stale in-memory list while the page is updating.
        this.persistRecords([]);
        this.setData({ records: [], editingId: '', editingDate: '', editingTime: '', editingLabel: '' });
        this.refreshDerived([]);
        wx.showToast({ title: '记录已清空', icon: 'success' });
      },
    });
  },

  setDueType(event) {
    const settings = { ...this.data.settings, dueType: event.currentTarget.dataset.type };
    this.setData({ settings });
    this.persistSettings(settings);
    this.refreshPregnancy(settings);
  },

  onDueDateChange(event) {
    const settings = { ...this.data.settings, dueDate: event.detail.value };
    this.setData({ settings });
    this.persistSettings(settings);
    this.refreshPregnancy(settings);
  },

  onExportFromChange(event) {
    const exportFrom = event.detail.value;
    const exportTo = exportFrom > this.data.exportTo ? exportFrom : this.data.exportTo;
    this.setData({ exportFrom, exportTo });
    this.refreshExportCount();
  },

  onExportToChange(event) {
    const exportTo = event.detail.value;
    const exportFrom = exportTo < this.data.exportFrom ? exportTo : this.data.exportFrom;
    this.setData({ exportFrom, exportTo });
    this.refreshExportCount();
  },

  exportCsv() {
    const records = this.getRecordsInRange();
    const rows = [
      ['日期', '时间', '时间戳'],
      ...records.map((item) => {
        const timestamp = Number(item.timestamp);
        return [dateKey(timestamp), formatTime(timestamp), new Date(timestamp).toISOString()];
      }),
    ];
    const csv = `\ufeff${rows.map((row) => row.map(quoteCsv).join(',')).join('\r\n')}`;
    const fileName = `胎动记录-${this.data.exportFrom}-${this.data.exportTo}.csv`;
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
    const fileSystem = wx.getFileSystemManager();

    wx.showLoading({ title: '正在生成' });
    fileSystem.writeFile({
      filePath,
      data: csv,
      encoding: 'utf8',
      success: () => {
        wx.hideLoading();
        this.shareCsvFile(filePath, fileName, records.length);
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '生成文件失败', icon: 'none' });
      },
    });
  },

  shareCsvFile(filePath, fileName, count) {
    if (typeof wx.shareFileMessage === 'function') {
      wx.shareFileMessage({
        filePath,
        fileName,
        success: () => wx.showToast({ title: `已导出${count}条`, icon: 'success' }),
        fail: (error) => {
          if (error && String(error.errMsg || '').includes('cancel')) return;
          this.openCsvFallback(filePath, count);
        },
      });
      return;
    }
    this.openCsvFallback(filePath, count);
  },

  openCsvFallback(filePath, count) {
    wx.openDocument({
      filePath,
      showMenu: true,
      success: () => wx.showToast({ title: `已导出${count}条`, icon: 'success' }),
      fail: () => wx.showModal({
        title: '请在手机微信中导出',
        content: '当前模拟器不支持文件分享。请点击右上角“预览”，在 iPhone 微信中打开后再次导出。',
        showCancel: false,
      }),
    });
  },

  handleLogin() {
    wx.showModal({
      title: '手机号认证说明',
      content: CLOUD_ENV_ID ? '点击“微信手机号认证”后，微信会弹出授权确认。认证结果只显示脱敏手机号。' : '当前工程还未配置微信云环境，因此仍是本机模式。要启用手机号认证，需要有效 AppID、云环境 ID 和登录云函数。',
      confirmText: '知道了',
      showCancel: false,
    });
  },

  handlePhoneLogin(event) {
    const detail = event.detail || {};
    if (!detail.code) {
      wx.showToast({ title: '未完成手机号授权', icon: 'none' });
      return;
    }
    if (!CLOUD_ENV_ID || !wx.cloud || typeof wx.cloud.callFunction !== 'function') {
      wx.showModal({
        title: '尚未启用手机号认证',
        content: '微信已返回授权凭证，但当前工程没有配置云函数，无法在本机解密手机号。记录仍会安全保存在本机。',
        confirmText: '知道了',
        showCancel: false,
      });
      return;
    }

    this.setData({ phoneLoginBusy: true });
    wx.cloud.callFunction({ name: 'login', data: { code: detail.code } }).then((response) => {
      const phoneNumber = response && response.result && response.result.phoneNumber;
      if (!phoneNumber) throw new Error('手机号认证返回为空');
      const phoneMasked = maskPhone(phoneNumber);
      const login = { loginState: 'phone', phoneMasked };
      this.setData({ loginState: 'phone', phoneMasked, phoneLoginBusy: false });
      this.persistLogin(login);
      wx.showToast({ title: '手机号已认证', icon: 'success' });
    }).catch(() => {
      this.setData({ phoneLoginBusy: false });
      wx.showToast({ title: '手机号认证失败，请重试', icon: 'none' });
    });
  },

  logoutPhone() {
    const login = { loginState: 'local', phoneMasked: '' };
    this.setData(login);
    this.persistLogin(login);
    wx.showToast({ title: '已切换为本机模式', icon: 'none' });
  },

  refreshDerived(records = this.data.records) {
    const now = new Date();
    const todayKey = dateKey(now);
    const todayRecords = records
      .filter((item) => dateKey(Number(item.timestamp)) === todayKey)
      .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
    const dailyStats = Array.from({ length: 7 }, (_, index) => {
      const day = addDays(now, index - 6);
      const key = dateKey(day);
      const count = records.filter((item) => dateKey(Number(item.timestamp)) === key).length;
      return { key, count, label: weekdayName(day, true) };
    });
    const maxDaily = Math.max(1, ...dailyStats.map((item) => item.count));
    dailyStats.forEach((item) => {
      item.height = item.count ? Math.max(12, Math.round(item.count / maxDaily * 100)) : 4;
      item.heightStyle = `height:${item.height}%;`;
    });

    const hourlyStats = Array.from({ length: 6 }, (_, index) => {
      const startHour = index * 4;
      const count = records.filter((item) => {
        const hour = new Date(Number(item.timestamp)).getHours();
        return hour >= startHour && hour < startHour + 4;
      }).length;
      return { label: String(startHour).padStart(2, '0'), count };
    });
    const maxHourly = Math.max(1, ...hourlyStats.map((item) => item.count));
    hourlyStats.forEach((item) => {
      item.height = item.count ? Math.max(12, Math.round(item.count / maxHourly * 100)) : 4;
      item.heightStyle = `height:${item.height}%;`;
    });
    const activeHour = hourlyStats.reduce((best, item) => item.count > best.count ? item : best, hourlyStats[0]);

    const todayWave = Array.from({ length: 12 }, (_, index) => {
      const count = todayRecords.filter((item) => {
        const hour = new Date(Number(item.timestamp)).getHours();
        return hour >= index * 2 && hour < index * 2 + 2;
      }).length;
      const height = count ? Math.min(100, 22 + count * 20) : 8;
      return { key: index, height, heightStyle: `height:${height}%;` };
    });

    this.setData({
      records,
      totalCount: records.length,
      todayCount: todayRecords.length,
      nextCount: todayRecords.length + 1,
      recentRecords: todayRecords.slice(0, 3).map((item) => ({ ...item, time: formatTime(Number(item.timestamp)) })),
      groupedRecords: this.groupRecords(this.getVisibleRecords(records, this.data.recordFilter, now), now, this.data.collapsedDays),
      visibleCount: this.getVisibleRecords(records, this.data.recordFilter, now).length,
      dailyStats,
      hourlyStats,
      todayWave,
      weeklyCount: dailyStats.reduce((sum, item) => sum + item.count, 0),
      mostActiveText: records.length ? `最活跃时段 ${activeHour.label}:00-${String(Number(activeHour.label) + 4).padStart(2, '0')}:00` : '记录后显示活跃时段',
    });
    this.refreshPregnancy(this.data.settings);
    this.refreshExportCount(records);
  },

  getVisibleRecords(records, filter = this.data.recordFilter, now = new Date()) {
    if (filter === 'all') return records.slice();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const nowTime = now.getTime();
    if (filter === 'today') {
      return records.filter((item) => Number(item.timestamp) >= todayStart && Number(item.timestamp) <= nowTime);
    }
    return records.filter((item) => Number(item.timestamp) >= todayStart - 6 * 86400000 && Number(item.timestamp) <= nowTime);
  },

  refreshRecordGroups(records = this.data.records, filter = this.data.recordFilter, collapsedDays = this.data.collapsedDays) {
    const now = new Date();
    const visibleRecords = this.getVisibleRecords(records, filter, now);
    this.setData({
      groupedRecords: this.groupRecords(visibleRecords, now, collapsedDays),
      visibleCount: visibleRecords.length,
    });
  },

  groupRecords(records, now, collapsedDays = {}) {
    const groups = {};
    records.forEach((item) => {
      const timestamp = Number(item.timestamp);
      const key = dateKey(timestamp);
      if (!groups[key]) groups[key] = [];
      groups[key].push({ ...item, time: formatTime(timestamp), dateText: formatFullDate(timestamp) });
    });
    const today = dateKey(now);
    const yesterday = dateKey(addDays(now, -1));
    return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map((key) => {
      const relativeLabel = key === today ? '今天' : key === yesterday ? '昨天' : '';
      return {
        key,
        relativeLabel,
        fullDate: `${formatFullDate(key)} 星期${weekdayName(key, true)}`,
        count: groups[key].length,
        collapsed: Object.prototype.hasOwnProperty.call(collapsedDays, key) ? collapsedDays[key] : key !== today,
        records: groups[key].sort((a, b) => Number(b.timestamp) - Number(a.timestamp)),
      };
    });
  },

  refreshPregnancy(settings) {
    this.setData({ dueInfo: calculatePregnancy(settings.dueType, settings.dueDate) });
  },

  getRecordsInRange(records = this.data.records) {
    const from = parseDate(this.data.exportFrom);
    const to = parseDate(this.data.exportTo);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    return records.filter((item) => {
      const timestamp = Number(item.timestamp);
      return timestamp >= from.getTime() && timestamp <= to.getTime();
    }).sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
  },

  refreshExportCount(records = this.data.records) {
    this.setData({ exportCount: this.getRecordsInRange(records).length });
  },

  persistRecords(records) {
    try {
      wx.setStorageSync(RECORDS_KEY, records);
    } catch (error) {
      wx.showToast({ title: '保存失败，请清理微信空间', icon: 'none' });
    }
  },

  persistSettings(settings) {
    try {
      wx.setStorageSync(SETTINGS_KEY, settings);
    } catch (error) {
      wx.showToast({ title: '设置保存失败', icon: 'none' });
    }
  },

  persistLogin(login) {
    try {
      wx.setStorageSync(LOGIN_KEY, login);
    } catch (error) {
      wx.showToast({ title: '登录状态保存失败', icon: 'none' });
    }
  },
});
