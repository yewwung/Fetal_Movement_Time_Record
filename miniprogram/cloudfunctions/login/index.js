const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  if (!event || !event.code) {
    throw new Error('Missing phone authorization code');
  }

  const result = await cloud.openapi.phonenumber.getPhoneNumber({ code: event.code });
  const phoneNumber = result && result.phone_info && result.phone_info.phoneNumber;
  if (!phoneNumber) {
    throw new Error('Phone number was not returned');
  }

  return {
    phoneNumber,
    openid: cloud.getWXContext().OPENID,
  };
};
