import DefaultTheme from "vitepress/theme";
import { useRouter } from "vitepress";
import { Icon } from "@iconify/vue";
import type { Theme } from "vitepress";

const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("Icon", Icon);
  },
  setup() {
    const router = useRouter();
    // Demo pages are standalone HTML files served from /public/demos/.
    // VitePress's SPA router would intercept clicks to these paths and show
    // a 404 because there is no matching VitePress route. Returning false
    // from onBeforeRouteChange cancels the SPA navigation and the assignment
    // to window.location triggers a full browser load of the actual file.
    router.onBeforeRouteChange = (to: string) => {
      // if (/^\/demos\/[^/]+\.html/.test(to)) { // this only regex some like /demos/demo1.html but not /demos/web-serial without .html
      if (/^\/demos\/[^/]+(\.html)?/.test(to)) {
        window.location.href = to;
        return false;
      }
    };
  },
};

export default theme;
