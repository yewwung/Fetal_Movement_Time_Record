const pad = (value) => String(value).padStart(2, '0');

const parseDate = (value) => {
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof value === 'number') return new Date(value);
  const parts = String(value || '').split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
};

const dateKey = (value) => {
  const date = parseDate(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const formatTime = (value, withSeconds = true) => {
  const date = parseDate(value);
  const base = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return withSeconds ? `${base}:${pad(date.getSeconds())}` : base;
};

const combineDateTime = (dateValue, timeValue) => {
  const dateParts = String(dateValue || '').split('-').map(Number);
  const timeParts = String(timeValue || '').split(':').map(Number);
  if (dateParts.length !== 3 || timeParts.length < 2 || dateParts.some(Number.isNaN) || timeParts.slice(0, 2).some(Number.isNaN)) {
    return null;
  }
  const [year, month, day] = dateParts;
  const [hours, minutes] = timeParts;
  const result = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return Number.isNaN(result.getTime()) ? null : result;
};

const formatMonthDay = (value) => {
  const date = parseDate(value);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

const formatFullDate = (value) => {
  const date = parseDate(value);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

const weekdayName = (value, short = false) => {
  const names = short ? ['日', '一', '二', '三', '四', '五', '六'] : ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return names[parseDate(value).getDay()];
};

const addDays = (value, days) => {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return date;
};

const daysBetween = (from, to) => {
  const start = parseDate(from);
  const end = parseDate(to);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.floor((end.getTime() - start.getTime()) / 86400000);
};

const calculatePregnancy = (type, value, now = new Date()) => {
  if (!value) return null;
  const chosen = parseDate(value);
  const lmp = type === 'lmp' ? chosen : addDays(chosen, -280);
  const dueDate = type === 'lmp' ? addDays(chosen, 280) : chosen;
  const gestationDays = Math.max(0, Math.min(280, daysBetween(lmp, now)));
  return {
    weeks: Math.floor(gestationDays / 7),
    days: gestationDays % 7,
    dueDate: dateKey(dueDate),
    dueText: formatMonthDay(dueDate),
  };
};

module.exports = {
  addDays,
  calculatePregnancy,
  combineDateTime,
  dateKey,
  daysBetween,
  formatMonthDay,
  formatFullDate,
  formatTime,
  parseDate,
  weekdayName,
};
