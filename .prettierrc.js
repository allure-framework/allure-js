/** @type {import("prettier").Options} */
module.exports = {
  trailingComma: "all",
  singleQuote: false,
  arrowParens: "always",
  plugins: [require.resolve("@trivago/prettier-plugin-sort-imports"), require.resolve("prettier-plugin-packagejson")],
  printWidth: 120,
  importOrder: ["allure", "^@allure/(.*)$", "app/(.*)$", "^[./]"],
  importOrderSeparation: false,
  importOrderSortSpecifiers: true,
  importOrderParserPlugins: ["typescript", "decorators-legacy"],
};
