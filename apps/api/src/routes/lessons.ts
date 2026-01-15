import { Hono } from "hono";
import { db } from "../db";
import {
  lessons as lessonsTable,
  items,
  itemTranslations,
  reviews,
} from "../db/schema";
import { eq, sql, count, and, gte } from "drizzle-orm";
import type { LessonWithProgress } from "@aslema/shared";

export const lessons = new Hono();

// Get all lessons with progress
lessons.get("/", async (c) => {
  const userId =
    c.req.header("X-User-Id") || c.req.query("userId") || "anonymous";

  const result = await db
    .select({
      id: lessonsTable.id,
      title: lessonsTable.title,
      description: lessonsTable.description,
      icon: lessonsTable.icon,
      orderIndex: lessonsTable.orderIndex,
      isPremium: lessonsTable.isPremium,
    })
    .from(lessonsTable)
    .orderBy(lessonsTable.orderIndex);

  // Get progress for each lesson
  const lessonsWithProgress: LessonWithProgress[] = await Promise.all(
    result.map(async (lesson) => {
      const [{ total }] = await db
        .select({ total: count() })
        .from(items)
        .where(eq(items.lessonId, lesson.id));

      // Count items learned by THIS user (reviewed at least twice = after J+1 revision)
      // repetitions >= 2 means: J+0 quiz (rep 0->1) + J+1 revision (rep 1->2)
      const [{ completed }] = await db
        .select({ completed: count() })
        .from(reviews)
        .innerJoin(items, eq(reviews.itemId, items.id))
        .where(
          and(
            eq(items.lessonId, lesson.id),
            eq(reviews.userId, userId),
            gte(reviews.repetitions, 2)
          )
        );

      return {
        ...lesson,
        isPremium: lesson.isPremium ?? false,
        orderIndex: lesson.orderIndex ?? 0,
        totalItems: total,
        completedItems: completed,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    })
  );

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

  const result = await db
    .select({
      id: items.id,
      lessonId: items.lessonId,
      type: items.type,
      tunisian: items.tunisian,
      audioFile: items.audioFile,
      difficulty: items.difficulty,
      orderIndex: items.orderIndex,
      translation: itemTranslations.translation,
    })
    .from(items)
    .leftJoin(
      itemTranslations,
      sql`${itemTranslations.itemId} = ${items.id} AND ${itemTranslations.locale} = ${locale}`
    )
    .where(eq(items.lessonId, id))
    .orderBy(shuffle ? sql`RANDOM()` : items.orderIndex);

  return c.json({ success: true, data: result });
});
