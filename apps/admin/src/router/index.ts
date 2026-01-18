import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "add-item",
      component: () => import("@/views/AddItem.vue"),
    },
    {
      path: "/audio",
      name: "add-audio",
      component: () => import("@/views/AddAudio.vue"),
    },
  ],
});

export default router;
