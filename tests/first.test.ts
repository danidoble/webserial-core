// import puppeteer from "puppeteer";
// import { Core } from "../lib/Core";
//
// describe("WebSerial Core Tests", () => {
//   let browser: puppeteer.Browser;
//   let page: puppeteer.Page;
//
//   beforeAll(async () => {
//     browser = await puppeteer.launch({
//       headless: false, // Set to true if you don't need to see the browser
//       args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
//     });
//     page = await browser.newPage();
//     await page.goto("http://localhost:5174"); // Replace with the URL of your test page
//   });
//
//   afterAll(async () => {
//     await browser.close();
//   });
//
//   test("should connect to a serial device", async () => {
//     // Replace with the actual code to test your library
//     await page.evaluate(async () => {
//       const core = new Core();
//       await core.connect();
//       // Add assertions to verify the connection
//     });
//   });
//
//   test("should send data to a serial device", async () => {
//     // Replace with the actual code to test your library
//     await page.evaluate(async () => {
//       const core = new Core();
//       await core.connect();
//       await core.sendData("test data");
//       // Add assertions to verify the data was sent
//     });
//   });
//
//   // Add more tests as needed
// });