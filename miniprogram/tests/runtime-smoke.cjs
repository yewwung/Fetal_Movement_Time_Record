const assert = require('node:assert/strict');
const path = require('node:path');

const storage = {};
let pageDefinition;
let writtenFile;
let sharedFile;

global.wx = {
  env: { USER_DATA_PATH: 'mock-user-data' },
  getStorageSync(key) { return storage[key]; },
  setStorageSync(key, value) { storage[key] = value; },
  removeStorageSync(key) { delete storage[key]; },
  showToast() {},
  showLoading() {},
  hideLoading() {},
  vibrateShort() {},
  showModal(options) { if (options.success) options.success({ confirm: true, cancel: false }); },
  getFileSystemManager() {
    return {
      writeFile(options) {
        writtenFile = options;
        options.success();
      },
    };
  },
  shareFileMessage(options) {
    sharedFile = options;
    options.success();
  },
  openDocument() {},
};

global.Page = (definition) => {
  pageDefinition = definition;
};

require(path.resolve(__dirname, '../pages/index/index.js'));

const page = {
  ...pageDefinition,
  data: JSON.parse(JSON.stringify(pageDefinition.data)),
  setData(patch) {
    this.data = { ...this.data, ...patch };
  },
};

page.onLoad();
assert.equal(page.data.records.length, 0);
assert.equal(page.data.activeTab, 'home');
assert.equal(page.data.loginState, 'local');
assert.match(page.data.todayDate, /^\d{4}-\d{2}-\d{2}$/);
assert.equal(page.data.recordLayout, 'compact');

const testNow = new Date();
const testOlder = new Date(testNow);
testOlder.setDate(testOlder.getDate() - 10);
const testGroups = page.groupRecords([
  { id: 'test-today', timestamp: testNow.getTime() },
  { id: 'test-older', timestamp: testOlder.getTime() },
], testNow);
assert.equal(testGroups[0].collapsed, false);
assert.equal(testGroups[1].collapsed, true);
assert.match(testGroups[1].fullDate, /年.*月.*日.*星期/);

page.handlePhoneLogin({ detail: { code: 'mock-phone-code' } });
assert.equal(page.data.loginState, 'local');

page.recordMovement();
assert.equal(page.data.records.length, 1);
assert.equal(storage['fetal-diary-records-v1'].length, 1);
assert.equal(page.data.todayCount, 1);
assert.equal(page.data.visibleCount, 1);
assert.match(page.data.groupedRecords[0].fullDate, /年.*月.*日.*星期/);
assert.equal(page.data.groupedRecords[0].collapsed, false);
assert.equal(page.data.groupedRecords[0].records[0].dateText, page.data.groupedRecords[0].fullDate.split(' ')[0]);

page.setRecordFilter({ currentTarget: { dataset: { filter: 'today' } } });
assert.equal(page.data.recordFilter, 'today');
assert.equal(page.data.visibleCount, 1);
page.setRecordFilter({ currentTarget: { dataset: { filter: 'week' } } });
page.setRecordLayout({ currentTarget: { dataset: { layout: 'list' } } });
assert.equal(page.data.recordLayout, 'list');
page.setRecordLayout({ currentTarget: { dataset: { layout: 'compact' } } });

const recordId = page.data.records[0].id;
page.startEditRecord({ currentTarget: { dataset: { id: recordId } } });
assert.equal(page.data.editingId, recordId);
page.onEditDateChange({ detail: { value: '2026-08-31' } });
page.onEditTimeChange({ detail: { value: '08:15' } });
page.saveEditRecord();
assert.equal(page.data.editingId, '');
assert.equal(new Date(page.data.records[0].timestamp).getHours(), 8);
assert.equal(new Date(page.data.records[0].timestamp).getMinutes(), 15);

page.exportCsv();
assert.ok(writtenFile.data.includes('日期'));
assert.ok(writtenFile.data.includes('时间戳'));
assert.ok(sharedFile.fileName.endsWith('.csv'));

page.setData({ exportTo: '2026-08-03' });
page.startEditRecord({ currentTarget: { dataset: { id: recordId } } });
assert.equal(page.data.editingDate, '2026-08-31');
page.cancelEditRecord();

page.deleteRecord({ currentTarget: { dataset: { id: recordId } } });
assert.equal(page.data.records.length, 0);

page.recordMovement();
page.recordMovement();
assert.equal(page.data.records.length, 2);
const oneOfTwoIds = page.data.records[0].id;
page.deleteRecord({ currentTarget: { dataset: { id: oneOfTwoIds } } });
assert.equal(page.data.records.length, 1);
assert.notEqual(page.data.records[0].id, oneOfTwoIds);
page.clearAllRecords();
assert.equal(page.data.records.length, 0);
assert.deepEqual(storage['fetal-diary-records-v1'], []);

// A quick tap after clearing must not resurrect a stale page-level list.
page.setData({ records: [{ id: 'stale', timestamp: Date.now() - 60000 }] });
page.recordMovement();
assert.equal(page.data.records.length, 1);
assert.notEqual(page.data.records[0].id, 'stale');

page.onDueDateChange({ detail: { value: '2026-01-01' } });
assert.ok(page.data.dueInfo);
assert.equal(page.data.dueInfo.dueDate, '2026-10-08');
assert.equal(storage['fetal-diary-settings-v1'].dueDate, '2026-01-01');

console.log(JSON.stringify({
  recordPersisted: true,
  recordEdited: true,
  phoneAuthFallback: true,
  csvGenerated: true,
  singleDelete: true,
  clearAllConfirmed: true,
  pregnancyCalculated: true,
}));
