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
import {
  DEFAULT_LOCALE,
  REVIEW_LIMITS,
  REVIEW_REPETITIONS,
  SM2,
  TIME,
  XP_GAINS,
  shuffle,
  type SM2Quality,
  type SM2Result,
} from "@aslema/shared";
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

  if (quality >= SM2.QUALITY_MIN_CORRECT) {
    // Correct response
    if (repetitions === SM2.INITIAL_REPETITIONS) {
      interval = SM2.FIRST_INTERVAL_DAYS;
    } else if (repetitions === SM2.SECOND_REPETITION) {
      interval = SM2.SECOND_INTERVAL_DAYS;
    } else {
      interval = Math.round(prevInterval * easeFactor);
    }
    repetitions += 1;
  } else {
    // Incorrect response - reset
    repetitions = SM2.INITIAL_REPETITIONS;
    interval = SM2.FIRST_INTERVAL_DAYS;
  }

  // Update ease factor
  easeFactor = Math.max(
    SM2.MIN_EASE_FACTOR,
    easeFactor +
      (SM2.EASE_BONUS -
        (SM2.QUALITY_PERFECT - quality) *
          (SM2.EASE_PENALTY_BASE +
            (SM2.QUALITY_PERFECT - quality) * SM2.EASE_PENALTY_FACTOR)),
  );

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);

  return { easeFactor, interval, repetitions, nextReviewAt };
}

function parseSM2Quality(value: unknown): SM2Quality | null {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return null;
  }
  if (value < 0 || value > SM2.QUALITY_PERFECT) {
    return null;
  }
  return value as SM2Quality;
}

reviews.get("/due", optionalUserId, async (c) => {
  const userId = c.get("userId");
  const locale = c.req.query("locale") || DEFAULT_LOCALE;
  const limit = parseInt(
    c.req.query("limit") || String(REVIEW_LIMITS.DUE_DEFAULT),
  );
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
    quality: unknown;
    responseTimeMs?: unknown;
    userAnswer?: unknown;
  }>();

  const quality = parseSM2Quality(body.quality);
  if (quality === null) {
    return c.json(
      { success: false, error: "quality must be an integer 0-5" },
      400,
    );
  }

  const responseTimeMs =
    typeof body.responseTimeMs === "number" &&
    Number.isFinite(body.responseTimeMs) &&
    body.responseTimeMs >= 0
      ? Math.round(body.responseTimeMs)
      : null;

  const userAnswer =
    typeof body.userAnswer === "string" ? body.userAnswer.slice(0, 1024) : null;

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

  const now = new Date();
  const isCorrect = quality >= SM2.QUALITY_MIN_CORRECT;

  // Calculate new SM-2 values
  const sm2Result = calculateSM2(
    quality,
    review.easeFactor ?? SM2.INITIAL_EASE_FACTOR,
    review.interval ?? SM2.INITIAL_INTERVAL,
    review.repetitions ?? SM2.INITIAL_REPETITIONS,
  );

  // Update review
  await db
    .update(reviewsTable)
    .set({
      easeFactor: sm2Result.easeFactor,
      interval: sm2Result.interval,
      repetitions: sm2Result.repetitions,
      nextReviewAt: sm2Result.nextReviewAt,
      lastReviewedAt: now,
    })
    .where(eq(reviewsTable.id, reviewId));

  // Record attempt
  await db.insert(attempts).values({
    reviewId,
    isCorrect,
    responseTimeMs,
    userAnswer,
  });

  // Update user stats
  if (isCorrect) {
    const xpGain =
      quality >= SM2.QUALITY_GOOD
        ? XP_GAINS.QUALITY_GOOD_OR_BETTER
        : XP_GAINS.QUALITY_OK;

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
    easeFactor: SM2.INITIAL_EASE_FACTOR,
    interval: SM2.INITIAL_INTERVAL,
    repetitions: SM2.INITIAL_REPETITIONS,
    nextReviewAt: now,
  }));

  await db.insert(reviewsTable).values(values).onConflictDoNothing();

  return c.json({ success: true, data: { created: values.length } });
});

reviews.get("/stats", requireUserId, async (c) => {
  const userId = c.get("userId");
  const dailyNewLimit = parseInt(
    c.req.query("dailyNewLimit") || String(REVIEW_LIMITS.NEW_DEFAULT),
  );

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
        gte(reviewsTable.repetitions, REVIEW_REPETITIONS.DUE_MIN),
        lte(reviewsTable.nextReviewAt, now),
      ),
    );

  // Count new items being learned (repetitions = 0, already in reviews table)
  const [newItemsBeingLearnedResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(reviewsTable)
    .where(
      and(
        eq(reviewsTable.userId, userId),
        eq(reviewsTable.repetitions, SM2.INITIAL_REPETITIONS),
      ),
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
        gte(reviewsTable.repetitions, REVIEW_REPETITIONS.DUE_MIN),
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
  const locale = c.req.query("locale") || DEFAULT_LOCALE;
  const newLimit = parseInt(
    c.req.query("newLimit") || String(REVIEW_LIMITS.NEW_DEFAULT),
  );
  const dueLimit = parseInt(
    c.req.query("dueLimit") || String(REVIEW_LIMITS.DUE_DEFAULT),
  );

  const now = new Date();
  const startOfToday = getStartOfDay(now);

  // Get items to review (repetitions >= 1 AND nextReviewAt <= now)
  // Get more items than needed to randomize from the lowest difficulties
  const dueReviewsRaw = await db
    .select({
      itemId: items.id,
      tunisian: items.tunisian,
      translation: itemTranslations.translation,
      audioFile: items.audioFile,
      reviewId: reviewsTable.id,
      lessonId: items.lessonId,
      _difficulty: items.difficulty, // Only for ordering
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
        gte(reviewsTable.repetitions, REVIEW_REPETITIONS.DUE_MIN),
        lte(reviewsTable.nextReviewAt, now),
      ),
    )
    .orderBy(items.difficulty)
    .limit(dueLimit * 2);

  // Remove _difficulty field and randomize
  const dueReviews = shuffle(dueReviewsRaw)
    .slice(0, dueLimit)
    .map(({ _difficulty, ...item }) => item);

  // Get new items being learned (repetitions = 0, already in reviews table)
  const newItemsBeingLearnedRaw = await db
    .select({
      itemId: items.id,
      tunisian: items.tunisian,
      translation: itemTranslations.translation,
      audioFile: items.audioFile,
      reviewId: reviewsTable.id,
      lessonId: items.lessonId,
      _difficulty: items.difficulty, // Only for ordering
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
        eq(reviewsTable.repetitions, SM2.INITIAL_REPETITIONS),
      ),
    )
    .orderBy(items.difficulty);

  const newItemsBeingLearned = shuffle(newItemsBeingLearnedRaw).map(
    ({ _difficulty, ...item }) => item,
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
  // Get truly new items sorted by difficulty, get more to randomize
  const trulyNewItemsRaw =
    remainingSlots > 0
      ? await db
          .select({
            itemId: items.id,
            tunisian: items.tunisian,
            translation: itemTranslations.translation,
            audioFile: items.audioFile,
            reviewId: sql<number | null>`NULL`,
            lessonId: items.lessonId,
            _difficulty: items.difficulty, // Only for ordering
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
          .orderBy(items.difficulty)
          .limit(remainingSlots * 2)
      : [];

  const trulyNewItems = shuffle(trulyNewItemsRaw)
    .slice(0, remainingSlots)
    .map(({ _difficulty, ...item }) => item);

  // Combine new items being learned + truly new items
  const newItems = [...newItemsBeingLearned, ...trulyNewItems];

  // Get items learned today (reviewed today, repetitions >= 1)
  const learnedTodayItemsRaw = await db
    .select({
      itemId: items.id,
      tunisian: items.tunisian,
      translation: itemTranslations.translation,
      audioFile: items.audioFile,
      reviewId: reviewsTable.id,
      lessonId: items.lessonId,
      _difficulty: items.difficulty, // Only for ordering
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
        gte(reviewsTable.repetitions, REVIEW_REPETITIONS.DUE_MIN),
        gte(reviewsTable.lastReviewedAt, startOfToday),
      ),
    )
    .orderBy(items.difficulty);

  const learnedTodayItems = shuffle(learnedTodayItemsRaw).map(
    ({ _difficulty, ...item }) => item,
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

const devToolsEnabled = process.env.ENABLE_DEV_ROUTES === "true";

if (devToolsEnabled) {
  // Simulate passing of days (moves nextReviewAt back in time)
  reviews.post("/dev/simulate-days", requireUserId, async (c) => {
    const userId = c.get("userId");
    const body = await c.req.json<{ days: number }>();
    const { days } = body;

    if (!days) {
      return c.json({ success: false, error: "days required" }, 400);
    }

    const daysNum = Number(days);
    const msToSubtract = daysNum * TIME.MS_PER_DAY;

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
}
