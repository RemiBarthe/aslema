import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ═══════════════════════════════════════════════════════════════
// CONTENT TABLES
// ═══════════════════════════════════════════════════════════════

export const lessons = sqliteTable("lessons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  icon: text("icon"),
  orderIndex: integer("order_index").default(0),
  isPremium: integer("is_premium", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

export const items = sqliteTable("items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lessonId: integer("lesson_id").references(() => lessons.id),
  type: text("type", {
    enum: ["word", "phrase", "expression", "dialogue", "verb"],
  })
    .notNull()
    .default("word"),
  tunisian: text("tunisian").notNull(),
  audioFile: text("audio_file"),
  difficulty: integer("difficulty").default(1),
  orderIndex: integer("order_index").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

// Unique constraint: one translation per item per locale
export const itemTranslations = sqliteTable(
  "item_translations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    locale: text("locale").notNull().default("fr"),
    translation: text("translation").notNull(),
  },
  (table) => [uniqueIndex("item_locale_idx").on(table.itemId, table.locale)]
);

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  color: text("color"),
});

// Unique constraint: one tag per item
export const itemTags = sqliteTable(
  "item_tags",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("item_tag_idx").on(table.itemId, table.tagId)]
);

// ═══════════════════════════════════════════════════════════════
// LEARNING TABLES
// ═══════════════════════════════════════════════════════════════

// Unique constraint: one review per user per item
export const reviews = sqliteTable(
  "reviews",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    easeFactor: real("ease_factor").default(2.5),
    interval: integer("interval").default(0),
    repetitions: integer("repetitions").default(0),
    nextReviewAt: integer("next_review_at", { mode: "timestamp" }),
    lastReviewedAt: integer("last_reviewed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
      () => new Date()
    ),
  },
  (table) => [uniqueIndex("user_item_idx").on(table.userId, table.itemId)]
);

export const attempts = sqliteTable("attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reviewId: integer("review_id")
    .notNull()
    .references(() => reviews.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id"),
  isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),
  responseTimeMs: integer("response_time_ms"),
  userAnswer: text("user_answer"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

export const userStats = sqliteTable("user_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().unique(),
  totalXp: integer("total_xp").default(0),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastActivityAt: integer("last_activity_at", { mode: "timestamp" }),
});

// ═══════════════════════════════════════════════════════════════
// EXERCISES TABLES
// ═══════════════════════════════════════════════════════════════

// Game types and their config:
// - qcm: uses exerciseOptions for choices
// - fill_blank: config = { sentence: "Je ___ manger", answer: "veux", hint?: "v..." }
// - dictation: config = { audioFile: "...", expectedText: "..." }
// - word_order: config = { words: ["je", "veux", "manger"], correctOrder: [0, 1, 2] }
// - match: config = { pairs: [{ left: "Aslema", right: "Bonjour" }, ...] }
// - write: config = { expectedAnswers: ["Aslema", "aslema"] }

export const exercises = sqliteTable("exercises", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  gameType: text("game_type", {
    enum: ["qcm", "fill_blank", "dictation", "word_order", "match", "write"],
  }).notNull(),
  questionType: text("question_type", {
    enum: [
      "tunisian_to_translation",
      "translation_to_tunisian",
      "audio_to_translation",
      "audio_to_tunisian",
    ],
  }).notNull(),
  config: text("config", { mode: "json" }), // JSON config for non-QCM games
});

// Only used for QCM game type
export const exerciseOptions = sqliteTable("exercise_options", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  exerciseId: integer("exercise_id")
    .notNull()
    .references(() => exercises.id, { onDelete: "cascade" }),
  optionText: text("option_text").notNull(),
  isCorrect: integer("is_correct", { mode: "boolean" }).default(false),
  orderIndex: integer("order_index").default(0),
});
