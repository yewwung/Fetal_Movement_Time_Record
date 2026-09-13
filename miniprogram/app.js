const { cloudEnvId } = require('./config');

App({
  globalData: {
    appName: '胎动日记',
    cloudEnabled: Boolean(cloudEnvId),
  },

  onLaunch() {
    if (cloudEnvId && wx.cloud && typeof wx.cloud.init === 'function') {
      wx.cloud.init({ env: cloudEnvId, traceUser: true });
    }
  },
});
