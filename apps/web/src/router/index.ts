import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/views/Home.vue"),
    },
    {
      path: "/review",
      name: "review",
      component: () => import("@/views/Review.vue"),
    },
    {
      path: "/review/session",
      name: "review-session",
      component: () => import("@/views/ReviewSession.vue"),
    },
    {
      path: "/learn/:lessonId",
      name: "lesson",
      component: () => import("@/views/Lesson.vue"),
      props: true,
    },
  ],
});

export default router;
