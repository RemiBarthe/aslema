import { Hono } from "hono";
import { db } from "../db";
import { lessons as lessonsTable, items, reviews } from "../db/schema";
import { eq, sql, and, gte } from "drizzle-orm";
import type { LessonWithProgress } from "@aslema/shared";
import { optionalUserId } from "../middleware/auth";
import { selectItemsWithTranslations } from "../db/queries/items";

type Variables = {
  userId: string;
};

export const lessons = new Hono<{ Variables: Variables }>();

// Get all lessons with progress
lessons.get("/", optionalUserId, async (c) => {
  const userId = c.get("userId");

  // Optimized query with LEFT JOINs and GROUP BY - single query, no N+1
  const result = await db
    .select({
      id: lessonsTable.id,
      title: lessonsTable.title,
      description: lessonsTable.description,
      icon: lessonsTable.icon,
      orderIndex: lessonsTable.orderIndex,
      isPremium: lessonsTable.isPremium,
      totalItems: sql<number>`COUNT(DISTINCT ${items.id})`.as("total_items"),
      completedItems: sql<number>`COUNT(DISTINCT CASE
        WHEN ${reviews.userId} = ${userId}
        AND ${reviews.repetitions} >= 2
        THEN ${reviews.itemId}
        END)`.as("completed_items"),
    })
    .from(lessonsTable)
    .leftJoin(items, eq(items.lessonId, lessonsTable.id))
    .leftJoin(
      reviews,
      and(eq(reviews.itemId, items.id), eq(reviews.userId, userId))
    )
    .groupBy(
      lessonsTable.id,
      lessonsTable.title,
      lessonsTable.description,
      lessonsTable.icon,
      lessonsTable.orderIndex,
      lessonsTable.isPremium
    )
    .orderBy(lessonsTable.orderIndex);

  // Map to LessonWithProgress format
  const lessonsWithProgress: LessonWithProgress[] = result.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    icon: lesson.icon,
    isPremium: lesson.isPremium ?? false,
    orderIndex: lesson.orderIndex ?? 0,
    totalItems: lesson.totalItems,
    completedItems: lesson.completedItems,
    progress:
      lesson.totalItems > 0
        ? Math.round((lesson.completedItems / lesson.totalItems) * 100)
        : 0,
  }));

  return c.json({ success: true, data: lessonsWithProgress });
});

// Get single lesson
lessons.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));

  const [lesson] = await db
    .select()
    .from(lessonsTable)
    .where(eq(lessonsTable.id, id));

  if (!lesson) {
    return c.json({ success: false, error: "Lesson not found" }, 404);
  }

  return c.json({ success: true, data: lesson });
});

// Get items for a lesson
lessons.get("/:id/items", async (c) => {
  const id = parseInt(c.req.param("id"));
  const locale = c.req.query("locale") || "fr";
  const shuffle = c.req.query("shuffle") === "true";

  const result = await selectItemsWithTranslations(locale)
    .where(eq(items.lessonId, id))
    .orderBy(shuffle ? sql`RANDOM()` : items.orderIndex);

  return c.json({ success: true, data: result });
});
