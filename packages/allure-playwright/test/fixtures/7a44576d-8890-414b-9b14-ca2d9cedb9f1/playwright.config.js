
     module.exports = {
       reporter: [
         [
           require.resolve("allure-playwright"),
           {
             outputFolder: "./allure-results",
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
  