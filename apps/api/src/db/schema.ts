import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

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
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
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
  phonetic: text("phonetic"),
  audioFile: text("audio_file"),
  difficulty: integer("difficulty").default(1),
  orderIndex: integer("order_index").default(0),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const itemTranslations = sqliteTable("item_translations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  locale: text("locale").notNull().default("fr"),
  translation: text("translation").notNull(),
  altTranslations: text("alt_translations", { mode: "json" }).$type<string[]>(),
});

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  color: text("color"),
});

export const itemTags = sqliteTable("item_tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
});

// ═══════════════════════════════════════════════════════════════
// LEARNING TABLES
// ═══════════════════════════════════════════════════════════════

export const reviews = sqliteTable("reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  easeFactor: real("ease_factor").default(2.5),
  interval: integer("interval").default(0),
  repetitions: integer("repetitions").default(0),
  nextReviewAt: text("next_review_at"),
  lastReviewedAt: text("last_reviewed_at"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const attempts = sqliteTable("attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reviewId: integer("review_id")
    .notNull()
    .references(() => reviews.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id"),
  isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),
  responseTimeMs: integer("response_time_ms"),
  userAnswer: text("user_answer"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const userStats = sqliteTable("user_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().unique(),
  totalXp: integer("total_xp").default(0),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastActivityAt: text("last_activity_at"),
});

// ═══════════════════════════════════════════════════════════════
// EXERCISES TABLES
// ═══════════════════════════════════════════════════════════════

export const exercises = sqliteTable("exercises", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  gameType: text("game_type", {
    enum: ["qcm", "fill_blank", "dictation", "match", "write"],
  }).notNull(),
  questionType: text("question_type", {
    enum: [
      "tunisian_to_translation",
      "translation_to_tunisian",
      "audio_to_translation",
      "audio_to_tunisian",
    ],
  }).notNull(),
});

export const exerciseOptions = sqliteTable("exercise_options", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  exerciseId: integer("exercise_id")
    .notNull()
    .references(() => exercises.id, { onDelete: "cascade" }),
  optionText: text("option_text").notNull(),
  isCorrect: integer("is_correct", { mode: "boolean" }).default(false),
  orderIndex: integer("order_index").default(0),
});
