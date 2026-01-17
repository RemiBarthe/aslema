import { db } from "../index";
import { items, itemTranslations } from "../schema";
import { sql } from "drizzle-orm";

/**
 * Base query builder for selecting items with their translations
 * @param locale - The locale for translations (default: "fr")
 * @returns Query builder that can be further chained with .where(), .orderBy(), etc.
 */
export function selectItemsWithTranslations(locale = "fr") {
  return db
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
    );
}

/**
 * Select a subset of item fields with translations (for random items, distractors, etc.)
 * @param locale - The locale for translations (default: "fr")
 * @returns Query builder for minimal item selection
 */
export function selectMinimalItemsWithTranslations(locale = "fr") {
  return db
    .select({
      id: items.id,
      tunisian: items.tunisian,
      translation: itemTranslations.translation,
    })
    .from(items)
    .leftJoin(
      itemTranslations,
      sql`${itemTranslations.itemId} = ${items.id} AND ${itemTranslations.locale} = ${locale}`
    );
}
