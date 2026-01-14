import { Hono } from "hono";
import { db } from "../db";
import {
  reviews as reviewsTable,
  attempts,
  items,
  itemTranslations,
  userStats,
} from "../db/schema";
import { eq, sql, lte, and, gte } from "drizzle-orm";
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
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    // Get current stats to calculate streak
    const [currentStats] = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, review.userId));

    let newStreak = 1;
    let newLongestStreak = 1;

    if (currentStats?.lastActivityAt) {
      const lastActivity = new Date(currentStats.lastActivityAt);
      const startOfLastActivity = new Date(
        lastActivity.getFullYear(),
        lastActivity.getMonth(),
        lastActivity.getDate()
      );
      const daysDiff = Math.floor(
        (startOfToday.getTime() - startOfLastActivity.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 0) {
        // Same day - keep current streak
        newStreak = currentStats.currentStreak ?? 1;
      } else if (daysDiff === 1) {
        // Consecutive day - increment streak
        newStreak = (currentStats.currentStreak ?? 0) + 1;
      }
      // else daysDiff > 1: streak resets to 1

      newLongestStreak = Math.max(newStreak, currentStats.longestStreak ?? 0);
    }

    await db
      .insert(userStats)
      .values({
        userId: review.userId,
        totalXp: xpGain,
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastActivityAt: now,
      })
      .onConflictDoUpdate({
        target: userStats.userId,
        set: {
          totalXp: sql`${userStats.totalXp} + ${xpGain}`,
          currentStreak: newStreak,
          longestStreak: newLongestStreak,
          lastActivityAt: now,
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
  const dailyNewLimit = parseInt(c.req.query("dailyNewLimit") || "5");

  if (!userId) {
    return c.json({ success: false, error: "userId required" }, 400);
  }

  // Get or create user stats
  const [stats] = await db
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId));

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  // Count due reviews (items user has learned at least once and are due)
  const [dueCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(reviewsTable)
    .where(
      and(
        eq(reviewsTable.userId, userId),
        gte(reviewsTable.repetitions, 1),
        lte(reviewsTable.nextReviewAt, now)
      )
    );

  // Count total new items available (items not yet in reviews for this user)
  const [totalNewCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(items)
    .where(
      sql`${items.id} NOT IN (
        SELECT ${reviewsTable.itemId} FROM ${reviewsTable} 
        WHERE ${reviewsTable.userId} = ${userId}
      )`
    );

  // Calculate streak
  let currentStreak = stats?.currentStreak ?? 0;
  if (stats?.lastActivityAt) {
    const lastActivity = new Date(stats.lastActivityAt);
    const startOfLastActivity = new Date(
      lastActivity.getFullYear(),
      lastActivity.getMonth(),
      lastActivity.getDate()
    );
    const daysDiff = Math.floor(
      (startOfToday.getTime() - startOfLastActivity.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (daysDiff > 1) {
      // Streak broken
      currentStreak = 0;
    }
  }

  // For display: show how many new items for today's session (capped by daily limit)
  const newItemsToday = Math.min(totalNewCount?.count ?? 0, dailyNewLimit);

  return c.json({
    success: true,
    data: {
      totalXp: stats?.totalXp ?? 0,
      currentStreak,
      longestStreak: stats?.longestStreak ?? 0,
      lastActivityAt: stats?.lastActivityAt?.toISOString() ?? null,
      dueReviews: dueCount?.count ?? 0,
      newItems: newItemsToday,
      totalNewAvailable: totalNewCount?.count ?? 0,
    },
  });
});

// Get today's learning session (due reviews + new items)
reviews.get("/today", async (c) => {
  const userId = c.req.query("userId");
  const locale = c.req.query("locale") || "fr";
  const newLimit = parseInt(c.req.query("newLimit") || "5");
  const dueLimit = parseInt(c.req.query("dueLimit") || "20");

  if (!userId) {
    return c.json({ success: false, error: "userId required" }, 400);
  }

  const now = new Date();

  // Get due reviews (only items that have been learned at least once)
  const dueReviews = await db
    .select({
      reviewId: reviewsTable.id,
      itemId: items.id,
      tunisian: items.tunisian,
      audioFile: items.audioFile,
      translation: itemTranslations.translation,
      easeFactor: reviewsTable.easeFactor,
      interval: reviewsTable.interval,
      repetitions: reviewsTable.repetitions,
      type: sql<"review">`'review'`,
    })
    .from(reviewsTable)
    .innerJoin(items, eq(reviewsTable.itemId, items.id))
    .leftJoin(
      itemTranslations,
      sql`${itemTranslations.itemId} = ${items.id} AND ${itemTranslations.locale} = ${locale}`
    )
    .where(
      and(
        eq(reviewsTable.userId, userId),
        gte(reviewsTable.repetitions, 1),
        lte(reviewsTable.nextReviewAt, now)
      )
    )
    .limit(dueLimit);

  // Get new items (not yet learned by this user)
  const newItems = await db
    .select({
      reviewId: sql<null>`NULL`,
      itemId: items.id,
      tunisian: items.tunisian,
      audioFile: items.audioFile,
      translation: itemTranslations.translation,
      easeFactor: sql<number>`2.5`,
      interval: sql<number>`0`,
      repetitions: sql<number>`0`,
      type: sql<"new">`'new'`,
    })
    .from(items)
    .leftJoin(
      itemTranslations,
      sql`${itemTranslations.itemId} = ${items.id} AND ${itemTranslations.locale} = ${locale}`
    )
    .where(
      sql`${items.id} NOT IN (
        SELECT ${reviewsTable.itemId} FROM ${reviewsTable} 
        WHERE ${reviewsTable.userId} = ${userId}
      )`
    )
    .orderBy(items.orderIndex)
    .limit(newLimit);

  return c.json({
    success: true,
    data: {
      dueReviews,
      newItems,
      totalDue: dueReviews.length,
      totalNew: newItems.length,
    },
  });
});
