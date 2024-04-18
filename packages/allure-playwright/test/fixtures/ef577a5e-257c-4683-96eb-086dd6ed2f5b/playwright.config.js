
     module.exports = {
       reporter: [
         [
           require.resolve("allure-playwright"),
           {
             resultsDir: "./allure-results",
             testMode: true,
           },
         ],
         ["dot"],
       ],

       projects: [
         {
           name: "project",
         },
       ],
     };
  