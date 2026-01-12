import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/views/HomeView.vue"),
    },
    {
      path: "/learn/:lessonId",
      name: "lesson",
      component: () => import("@/views/LessonView.vue"),
      props: true,
    },
  ],
});

export default router;
