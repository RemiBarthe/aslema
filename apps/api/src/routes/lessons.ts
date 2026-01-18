import { Hono } from "hono";
import { db } from "../db";
import { lessons as lessonsTable, items, reviews } from "../db/schema";
import { eq, sql, and, gte } from "drizzle-orm";
import {
  DEFAULT_LOCALE,
  REVIEW_REPETITIONS,
  type LessonWithProgress,
} from "@aslema/shared";
import { optionalUserId } from "../middleware/auth";

type Variables = {
  userId: string;
};

export const lessons = new Hono<{ Variables: Variables }>();

lessons.get("/", optionalUserId, async (c) => {
  const userId = c.get("userId");

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
        AND ${reviews.repetitions} >= ${REVIEW_REPETITIONS.COMPLETED_MIN}
        THEN ${reviews.itemId}
        END)`.as("completed_items"),
    })
    .from(lessonsTable)
    .leftJoin(items, eq(items.lessonId, lessonsTable.id))
    .leftJoin(
      reviews,
      and(eq(reviews.itemId, items.id), eq(reviews.userId, userId)),
    )
    .groupBy(
      lessonsTable.id,
      lessonsTable.title,
      lessonsTable.description,
      lessonsTable.icon,
      lessonsTable.orderIndex,
      lessonsTable.isPremium,
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

lessons.get("/:id/items", optionalUserId, async (c) => {
  const id = parseInt(c.req.param("id"));
  const userId = c.get("userId");
  const locale = c.req.query("locale") || DEFAULT_LOCALE;
  const shuffle = c.req.query("shuffle") === "true";

  const result = await db
    .select({
      itemId: items.id,
      tunisian: items.tunisian,
      translation: sql<string>`COALESCE(${sql.raw(`item_translations.translation`)}, ${items.tunisian})`,
      audioFile: items.audioFile,
      reviewId: sql<number | null>`NULL`,
      lessonId: items.lessonId,
      isLearned: sql<boolean>`COALESCE(${reviews.repetitions}, 0) >= ${REVIEW_REPETITIONS.COMPLETED_MIN}`,
    })
    .from(items)
    .leftJoin(
      sql.raw(`item_translations`),
      sql`item_translations.item_id = ${items.id} AND item_translations.locale = ${locale}`,
    )
    .leftJoin(
      reviews,
      and(eq(reviews.itemId, items.id), eq(reviews.userId, userId)),
    )
    .where(eq(items.lessonId, id))
    .orderBy(shuffle ? sql`RANDOM()` : items.orderIndex);

  return c.json({ success: true, data: result });
});

// Create a new lesson
lessons.post("/", async (c) => {
  const body = await c.req.json();
  const { title, description, icon } = body;

  if (!title) {
    return c.json(
      { success: false, error: "title is required" },
      400
    );
  }

  const result = await db
    .insert(lessonsTable)
    .values({
      title,
      description: description || null,
      icon: icon || null,
    })
    .returning({ id: lessonsTable.id });

  return c.json({
    success: true,
    data: { id: result[0].id },
  });
});
