import { Hono } from "hono";
import { db } from "../db";
import {
  reviews as reviewsTable,
  attempts,
  items,
  itemTranslations,
  userStats,
} from "../db/schema";
import { eq, sql, lte, and } from "drizzle-orm";
import type { SM2Quality, SM2Result } from "@aslema/shared";

export const reviews = new Hono();

// SM-2 Algorithm implementation
function calculateSM2(
  quality: SM2Quality,
  prevEaseFactor: number,
  prevInterval: number,
  prevRepetitions: number
): SM2Result {
  let easeFactor = prevEaseFactor;
  let interval = prevInterval;
  let repetitions = prevRepetitions;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(prevInterval * easeFactor);
    }
    repetitions += 1;
  } else {
    // Incorrect response - reset
    repetitions = 0;
    interval = 1;
  }

  // Update ease factor
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);

  return { easeFactor, interval, repetitions, nextReviewAt };
}

// Get due reviews for a user
reviews.get("/due", async (c) => {
  const userId = c.req.query("userId") || "anonymous";
  const locale = c.req.query("locale") || "fr";
  const limit = parseInt(c.req.query("limit") || "10");
  const now = new Date();

  const result = await db
    .select({
      reviewId: reviewsTable.id,
      itemId: items.id,
      tunisian: items.tunisian,
      audioFile: items.audioFile,
      translation: itemTranslations.translation,
      easeFactor: reviewsTable.easeFactor,
      interval: reviewsTable.interval,
      repetitions: reviewsTable.repetitions,
    })
    .from(reviewsTable)
    .innerJoin(items, eq(reviewsTable.itemId, items.id))
    .leftJoin(
      itemTranslations,
      sql`${itemTranslations.itemId} = ${items.id} AND ${itemTranslations.locale} = ${locale}`
    )
    .where(
      and(eq(reviewsTable.userId, userId), lte(reviewsTable.nextReviewAt, now))
    )
    .limit(limit);

  return c.json({ success: true, data: result });
});

// Submit a review answer
reviews.post("/:id/answer", async (c) => {
  const reviewId = parseInt(c.req.param("id"));
  const body = await c.req.json<{
    quality: SM2Quality;
    isCorrect: boolean;
    responseTimeMs?: number;
    userAnswer?: string;
  }>();

  // Get current review
  const [review] = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.id, reviewId));

  if (!review) {
    return c.json({ success: false, error: "Review not found" }, 404);
  }

  // Calculate new SM-2 values
  const sm2Result = calculateSM2(
    body.quality,
    review.easeFactor ?? 2.5,
    review.interval ?? 0,
    review.repetitions ?? 0
  );

  // Update review
  await db
    .update(reviewsTable)
    .set({
      easeFactor: sm2Result.easeFactor,
      interval: sm2Result.interval,
      repetitions: sm2Result.repetitions,
      nextReviewAt: sm2Result.nextReviewAt,
      lastReviewedAt: new Date(),
    })
    .where(eq(reviewsTable.id, reviewId));

  // Record attempt
  await db.insert(attempts).values({
    reviewId,
    isCorrect: body.isCorrect,
    responseTimeMs: body.responseTimeMs,
    userAnswer: body.userAnswer,
  });

  // Update user stats
  if (body.isCorrect) {
    const xpGain = body.quality >= 4 ? 15 : 10;
    await db
      .insert(userStats)
      .values({
        userId: review.userId,
        totalXp: xpGain,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userStats.userId,
        set: {
          totalXp: sql`${userStats.totalXp} + ${xpGain}`,
          lastActivityAt: new Date(),
        },
      });
  }

  return c.json({
    success: true,
    data: {
      ...sm2Result,
      nextReviewAt: sm2Result.nextReviewAt.toISOString(),
    },
  });
});

// Start learning new items (create reviews)
reviews.post("/start", async (c) => {
  const body = await c.req.json<{
    userId: string;
    itemIds: number[];
  }>();

  const now = new Date();

  // Create reviews for new items
  const values = body.itemIds.map((itemId) => ({
    userId: body.userId,
    itemId,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewAt: now,
  }));

  await db.insert(reviewsTable).values(values).onConflictDoNothing();

  return c.json({ success: true, data: { created: values.length } });
});

// Get user stats
reviews.get("/stats", async (c) => {
  const userId = c.req.query("userId");

  if (!userId) {
    return c.json({ success: false, error: "userId required" }, 400);
  }

  // Get or create user stats
  const [stats] = await db
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId));

  if (!stats) {
    return c.json({
      success: true,
      data: {
        totalXp: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityAt: null,
      },
    });
  }

  // Count total reviews and due reviews
  const reviewCounts = await db
    .select({
      total: sql<number>`COUNT(*)`,
      due: sql<number>`SUM(CASE WHEN ${
        reviewsTable.nextReviewAt
      } <= ${Date.now()} THEN 1 ELSE 0 END)`,
    })
    .from(reviewsTable)
    .where(eq(reviewsTable.userId, userId));

  return c.json({
    success: true,
    data: {
      totalXp: stats.totalXp ?? 0,
      currentStreak: stats.currentStreak ?? 0,
      longestStreak: stats.longestStreak ?? 0,
      lastActivityAt: stats.lastActivityAt?.toISOString() ?? null,
      totalReviews: reviewCounts[0]?.total ?? 0,
      dueReviews: reviewCounts[0]?.due ?? 0,
    },
  });
});
