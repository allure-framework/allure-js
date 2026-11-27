const { ALLURE_SERVICE_TOKEN, ALLURE_SKIP_SERVICE_UPLOAD } = process.env;

const allureService =
  ALLURE_SERVICE_TOKEN && ALLURE_SKIP_SERVICE_UPLOAD != "true"
    ? {
        accessToken: ALLURE_SERVICE_TOKEN,
        uploadConcurrency: 100,
      }
    : undefined;

export default {
  name: "Allure JS",
  output: "./out/allure-report",
  plugins: {
    awesome: {
      options: {
        publish: true,
      },
    },
    testops: {
      options: {
        launchName: `Allure JS GitHub actions run (${new Date().toISOString()})`,
      },
    },
  },
  ...(allureService ? { allureService } : {}),
};
