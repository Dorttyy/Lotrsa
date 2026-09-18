module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    revenueCat: {
      testApiKey: process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY,
      iosApiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
      androidApiKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    },
  },
});