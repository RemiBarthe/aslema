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
import { requireUserId, optionalUserId } from "../middleware/auth";
import {
  getStartOfDay,
  calculateNewStreak,
  getCurrentStreak,
} from "../utils/date";

type Variables = {
  userId: string;
};

export const reviews = new Hono<{ Variables: Variables }>();

// SM-2 Algorithm implementation
function calculateSM2(
  quality: SM2Quality,
  prevEaseFactor: number,
  prevInterval: number,
  prevRepetitions: number,
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
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);

  return { easeFactor, interval, repetitions, nextReviewAt };
}

reviews.get("/due", optionalUserId, async (c) => {
  const userId = c.get("userId");
  const locale = c.req.query("locale") || "fr";
  const limit = parseInt(c.req.query("limit") || "10");
  const now = new Date();

  const result = await db
    .select({
      itemId: items.id,
      tunisian: items.tunisian,
      translation: itemTranslations.translation,
      audioFile: items.audioFile,
      reviewId: reviewsTable.id,
      lessonId: items.lessonId,
    })
    .from(reviewsTable)
    .innerJoin(items, eq(reviewsTable.itemId, items.id))
    .leftJoin(
      itemTranslations,
      sql`${itemTranslations.itemId} = ${items.id} AND ${itemTranslations.locale} = ${locale}`,
    )
    .where(
      and(eq(reviewsTable.userId, userId), lte(reviewsTable.nextReviewAt, now)),
    )
    .limit(limit);

  return c.json({ success: true, data: result });
});

reviews.post("/:id/answer", requireUserId, async (c) => {
  const userId = c.get("userId");
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

  // Verify that the review belongs to the authenticated user
  if (review.userId !== userId) {
    return c.json({ success: false, error: "Unauthorized" }, 403);
  }

  // Calculate new SM-2 values
  const sm2Result = calculateSM2(
    body.quality,
    review.easeFactor ?? 2.5,
    review.interval ?? 0,
    review.repetitions ?? 0,
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

    // Get current stats to calculate streak
    const [currentStats] = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, review.userId));

    const newStreak = calculateNewStreak(
      currentStats?.lastActivityAt ?? null,
      currentStats?.currentStreak ?? 0,
    );
    const newLongestStreak = Math.max(
      newStreak,
      currentStats?.longestStreak ?? 0,
    );

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

reviews.post("/start", requireUserId, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{
    itemIds: number[];
  }>();

  const now = new Date();

  // Create reviews for new items
  const values = body.itemIds.map((itemId) => ({
    userId,
    itemId,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewAt: now,
  }));

  await db.insert(reviewsTable).values(values).onConflictDoNothing();

  return c.json({ success: true, data: { created: values.length } });
});

reviews.get("/stats", requireUserId, async (c) => {
  const userId = c.get("userId");
  const dailyNewLimit = parseInt(c.req.query("dailyNewLimit") || "5");

  // Get or create user stats
  const [stats] = await db
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId));

  const now = new Date();
  const startOfToday = getStartOfDay(now);

  // Calculate current streak (0 if broken)
  const currentStreak = getCurrentStreak(
    stats?.lastActivityAt ?? null,
    stats?.currentStreak ?? 0,
  );

  // Count due reviews (repetitions >= 1 AND nextReviewAt <= now)
  const [dueResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(reviewsTable)
    .where(
      and(
        eq(reviewsTable.userId, userId),
        gte(reviewsTable.repetitions, 1),
        lte(reviewsTable.nextReviewAt, now),
      ),
    );

  // Count new items being learned (repetitions = 0, already in reviews table)
  const [newItemsBeingLearnedResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(reviewsTable)
    .where(
      and(eq(reviewsTable.userId, userId), eq(reviewsTable.repetitions, 0)),
    );
  const newItemsBeingLearnedCount = newItemsBeingLearnedResult?.count ?? 0;

  // Count how many items were started today (created in reviews table today)
  const [startedTodayResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(reviewsTable)
    .where(
      and(
        eq(reviewsTable.userId, userId),
        gte(reviewsTable.createdAt, startOfToday),
      ),
    );

  // Calculate how many truly new items can be added today
  const remainingNewToday = Math.max(
    0,
    dailyNewLimit - (startedTodayResult?.count ?? 0),
  );

  // Fill up to the daily new limit, accounting for items already being learned.
  const remainingSlots = Math.max(
    0,
    Math.min(remainingNewToday, dailyNewLimit - newItemsBeingLearnedCount),
  );

  // Count truly new items available (never started)
  const [totalNewResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(items)
    .where(
      sql`${items.id} NOT IN (
        SELECT ${reviewsTable.itemId} FROM ${reviewsTable}
        WHERE ${reviewsTable.userId} = ${userId}
      )`,
    );

  const trulyNewAvailable = Math.min(
    totalNewResult?.count ?? 0,
    remainingSlots,
  );

  // Total new items in today's session = items being learned + truly new available
  const newItemsCount = newItemsBeingLearnedCount + trulyNewAvailable;

  // Count items learned today (had their first successful review today)
  const [learnedTodayResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(reviewsTable)
    .where(
      and(
        eq(reviewsTable.userId, userId),
        gte(reviewsTable.repetitions, 1),
        gte(reviewsTable.lastReviewedAt, startOfToday),
      ),
    );

  return c.json({
    success: true,
    data: {
      totalXp: stats?.totalXp ?? 0,
      currentStreak,
      longestStreak: stats?.longestStreak ?? 0,
      lastActivityAt: stats?.lastActivityAt?.toISOString() ?? null,
      dueReviews: dueResult?.count ?? 0,
      newItems: newItemsCount,
      learnedToday: learnedTodayResult?.count ?? 0,
      totalNewAvailable: totalNewResult?.count ?? 0,
    },
  });
});

reviews.get("/today", requireUserId, async (c) => {
  const userId = c.get("userId");
  const locale = c.req.query("locale") || "fr";
  const newLimit = parseInt(c.req.query("newLimit") || "5");
  const dueLimit = parseInt(c.req.query("dueLimit") || "20");

  const now = new Date();
  const startOfToday = getStartOfDay(now);

  // Get items to review (repetitions >= 1 AND nextReviewAt <= now)
  const dueReviews = await db
    .select({
      itemId: items.id,
      tunisian: items.tunisian,
      translation: itemTranslations.translation,
      audioFile: items.audioFile,
      reviewId: reviewsTable.id,
      lessonId: items.lessonId,
    })
    .from(reviewsTable)
    .innerJoin(items, eq(reviewsTable.itemId, items.id))
    .leftJoin(
      itemTranslations,
      sql`${itemTranslations.itemId} = ${items.id} AND ${itemTranslations.locale} = ${locale}`,
    )
    .where(
      and(
        eq(reviewsTable.userId, userId),
        gte(reviewsTable.repetitions, 1),
        lte(reviewsTable.nextReviewAt, now),
      ),
    )
    .limit(dueLimit);

  // Get new items being learned (repetitions = 0, already in reviews table)
  const newItemsBeingLearned = await db
    .select({
      itemId: items.id,
      tunisian: items.tunisian,
      translation: itemTranslations.translation,
      audioFile: items.audioFile,
      reviewId: reviewsTable.id,
      lessonId: items.lessonId,
    })
    .from(reviewsTable)
    .innerJoin(items, eq(reviewsTable.itemId, items.id))
    .leftJoin(
      itemTranslations,
      sql`${itemTranslations.itemId} = ${items.id} AND ${itemTranslations.locale} = ${locale}`,
    )
    .where(
      and(eq(reviewsTable.userId, userId), eq(reviewsTable.repetitions, 0)),
    );

  // Count how many items were created today (started learning today)
  const [{ startedToday }] = await db
    .select({ startedToday: sql<number>`COUNT(*)` })
    .from(reviewsTable)
    .where(
      and(
        eq(reviewsTable.userId, userId),
        gte(reviewsTable.createdAt, startOfToday),
      ),
    );

  const newItemsBeingLearnedCount = newItemsBeingLearned.length;
  const remainingNewToday = Math.max(0, newLimit - (startedToday ?? 0));

  // Get truly new items (never seen before) up to remaining daily limit
  // Fill up to the daily new limit, accounting for items already being learned.
  const remainingSlots = Math.max(
    0,
    Math.min(remainingNewToday, newLimit - newItemsBeingLearnedCount),
  );
  const trulyNewItems =
    remainingSlots > 0
      ? await db
          .select({
            itemId: items.id,
            tunisian: items.tunisian,
            translation: itemTranslations.translation,
            audioFile: items.audioFile,
            reviewId: sql<number | null>`NULL`,
            lessonId: items.lessonId,
          })
          .from(items)
          .leftJoin(
            itemTranslations,
            sql`${itemTranslations.itemId} = ${items.id} AND ${itemTranslations.locale} = ${locale}`,
          )
          .where(
            sql`${items.id} NOT IN (
            SELECT ${reviewsTable.itemId} FROM ${reviewsTable}
            WHERE ${reviewsTable.userId} = ${userId}
          )`,
          )
          .orderBy(items.orderIndex)
          .limit(remainingSlots)
      : [];

  // Combine new items being learned + truly new items
  const newItems = [...newItemsBeingLearned, ...trulyNewItems];

  // Get items learned today (reviewed today, repetitions >= 1)
  const learnedTodayItems = await db
    .select({
      itemId: items.id,
      tunisian: items.tunisian,
      translation: itemTranslations.translation,
      audioFile: items.audioFile,
      reviewId: reviewsTable.id,
      lessonId: items.lessonId,
    })
    .from(reviewsTable)
    .innerJoin(items, eq(reviewsTable.itemId, items.id))
    .leftJoin(
      itemTranslations,
      sql`${itemTranslations.itemId} = ${items.id} AND ${itemTranslations.locale} = ${locale}`,
    )
    .where(
      and(
        eq(reviewsTable.userId, userId),
        gte(reviewsTable.repetitions, 1),
        gte(reviewsTable.lastReviewedAt, startOfToday),
      ),
    );

  return c.json({
    success: true,
    data: {
      dueReviews,
      newItems,
      learnedTodayItems,
    },
  });
});

// ═══════════════════════════════════════════════════════════════
// DEV TOOLS (for testing)
// ═══════════════════════════════════════════════════════════════

// Simulate passing of days (moves nextReviewAt back in time)
reviews.post("/dev/simulate-days", requireUserId, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ days: number }>();
  const { days } = body;

  if (!days) {
    return c.json({ success: false, error: "days required" }, 400);
  }

  const daysNum = Number(days);
  const msToSubtract = daysNum * 24 * 60 * 60 * 1000;

  // Get all reviews for this user and update them
  const userReviews = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.userId, userId));

  for (const review of userReviews) {
    const updates: {
      nextReviewAt?: Date;
      lastReviewedAt?: Date;
      createdAt?: Date;
    } = {};

    if (review.nextReviewAt) {
      updates.nextReviewAt = new Date(
        review.nextReviewAt.getTime() - msToSubtract,
      );
    }
    if (review.lastReviewedAt) {
      updates.lastReviewedAt = new Date(
        review.lastReviewedAt.getTime() - msToSubtract,
      );
    }
    if (review.createdAt) {
      updates.createdAt = new Date(review.createdAt.getTime() - msToSubtract);
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(reviewsTable)
        .set(updates)
        .where(eq(reviewsTable.id, review.id));
    }
  }

  // Also update lastActivityAt to simulate time passing
  const [stats] = await db
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId));

  if (stats?.lastActivityAt) {
    const newDate = new Date(stats.lastActivityAt.getTime() - msToSubtract);
    await db
      .update(userStats)
      .set({ lastActivityAt: newDate })
      .where(eq(userStats.userId, userId));
  }

  return c.json({
    success: true,
    data: { message: `Simulated ${days} day(s) passing` },
  });
});

// Reset all learning progress for a user
reviews.post("/dev/reset", requireUserId, async (c) => {
  const userId = c.get("userId");

  // Delete all reviews for this user
  await db.delete(reviewsTable).where(eq(reviewsTable.userId, userId));

  // Delete all attempts for this user's reviews (already cascade deleted)

  // Reset user stats
  await db.delete(userStats).where(eq(userStats.userId, userId));

  return c.json({
    success: true,
    data: { message: "All learning progress reset" },
  });
});
