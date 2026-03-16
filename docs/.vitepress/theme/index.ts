import DefaultTheme from "vitepress/theme";
import { Icon } from "@iconify/vue";
import type { Theme } from "vitepress";

const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("Icon", Icon);
  },
};

export default theme;
