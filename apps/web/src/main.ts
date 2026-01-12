import { createApp } from "vue";
import { VueQueryPlugin } from "@tanstack/vue-query";
import "./style.css";
import App from "./App.vue";
import router from "./router";

const app = createApp(App);

app.use(router);
app.use(VueQueryPlugin, {
  queryClientConfig: {
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 1,
      },
    },
  },
});

app.mount("#app");
