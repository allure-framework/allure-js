const { ALLURE_SERVICE_TOKEN } = process.env;

const allureService = ALLURE_SERVICE_TOKEN
  ? {
      accessToken: ALLURE_SERVICE_TOKEN,
    }
  : undefined;

export default {
  name: "Allure JS",
  output: "./out/allure-report",
  plugins: {
    awesome: {
      options: {
        publish: false,
      },
    },
  },
  ...(allureService ? { allureService } : {}),
};
