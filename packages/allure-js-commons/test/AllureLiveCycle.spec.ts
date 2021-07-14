// import AllureLiveCycle from "../src/AllureLiveCycle";
// import { Status, TestResult } from "..";
// import { testResult } from "../src/constructors";
// import { mocked } from "ts-jest/utils";
// import { v4 } from "uuid";
//
// // jest.mock("uuid");
//
// describe("AllureLiveCycle flows", () => {
//   describe("TestResult flows", () => {
//     test("Single TestResult flow with uuid in calls", () => {
//       // const fakeUUID = "TestResult-uuid";
//       // mocked(v4).mockImplementationOnce(() => fakeUUID);
//
//       const allureLiveCycle = new AllureLiveCycle();
//
//       const uuid = allureLiveCycle.scheduleTest(testResult => {
//         testResult.name = "Test name";
//       });
//       allureLiveCycle.startTest(testResult => {
//       }, uuid);
//
//       allureLiveCycle.updateTest(testResult => {
//         testResult.status = Status.PASSED;
//       }, uuid);
//
//       allureLiveCycle.stopTest(testResult => {
//       }, uuid);
//
//
//       const u1 = allureLiveCycle.startStep(_ => {
//       }, uuid);
//       const u2 = allureLiveCycle.startStep(_ => {
//       }, u1);
//       allureLiveCycle.stopStep(_ => {
//       }, u1);
//       allureLiveCycle.stopStep(_ => {
//       }, u2);
//
//
//       allureLiveCycle.writeTest((t) => {
//         console.log(t)
//       }, uuid);
//     });
//   });
// });
//
