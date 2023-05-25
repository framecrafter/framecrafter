// web-test-runner.config.js
import {
  vitePlugin,
  removeViteLogging,
} from "@remcovaes/web-test-runner-vite-plugin";
import { playwrightLauncher } from "@web/test-runner-playwright";

export default {
  files: "src/**/*.test.ts",
  plugins: [vitePlugin()],
  playwright: true,
  manual: true,
  open: true,
  // debug: true,
  browsers: [
    playwrightLauncher({
      launchOptions: {
        headless: false,
        devtools: true,
      },
    }),
  ],
  filterBrowserLogs: removeViteLogging,
};
