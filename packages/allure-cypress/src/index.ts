import Cypress from "cypress";

export const allureCypress = (on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) => {
  // console.log({
  //   on,
  //   config,
  // });
  on("before:run", (details) => {
    console.log("before:run", details);
  });
  on("after:run", (details) => {
    console.log("after:run", details);
  });
  on("before:spec", (details) => {
    console.log("before:spec", details);
  });
  on("after:spec", (details) => {
    console.log("after:spec", details);
  });
  on("after:screenshot", (details) => {
    // TODO: attach screenshot here
    // console.log("after:screenshot", details);
  });
};
