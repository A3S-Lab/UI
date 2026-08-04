import { defineConfig } from "@playwright/test";

const externalBaseUrl = process.env.A3S_UI_VISUAL_BASE_URL;
const baseURL = externalBaseUrl ?? "http://127.0.0.1:4176/UI/";
const chromiumExecutablePath = process.env.A3S_UI_VISUAL_CHROMIUM_EXECUTABLE;
const chromiumLaunchArgs =
  chromiumExecutablePath && process.platform === "win32"
    ? ["--do-not-de-elevate"]
    : undefined;

export default defineConfig({
  testDir: "./visual-tests",
  timeout: 60_000,
  outputDir: "./temp/test-results/visual",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [
        ["line"],
        ["html", { outputFolder: "temp/playwright-report", open: "never" }],
      ]
    : "line",
  snapshotPathTemplate:
    "{testDir}/__snapshots__/{platform}/{projectName}/{arg}{ext}",
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.005,
      scale: "css",
      threshold: 0.2,
    },
  },
  use: {
    baseURL,
    colorScheme: "light",
    deviceScaleFactor: 1,
    launchOptions: chromiumExecutablePath
      ? { args: chromiumLaunchArgs, executablePath: chromiumExecutablePath }
      : undefined,
    locale: "en-US",
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    timezoneId: "UTC",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-1280",
      use: { viewport: { width: 1280, height: 900 } },
    },
    {
      name: "compact-768",
      use: { viewport: { width: 768, height: 900 } },
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command:
          "npm --prefix site run build && npm --prefix site run preview -- --host 127.0.0.1 --port 4176",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        url: baseURL,
      },
});
