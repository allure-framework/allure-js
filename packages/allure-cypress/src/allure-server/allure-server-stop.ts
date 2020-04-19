import { allureApiUrls } from "../consts/allure-api-urls";

const request = require("request");

request({
  url: `${allureApiUrls.apiUrl}/__close__`,
  method: "GET"
});
