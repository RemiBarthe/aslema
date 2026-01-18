import { db } from "../index";
import { items, itemTranslations } from "../schema";
import { sql } from "drizzle-orm";

export function selectStudyItems(locale = "fr") {
  return db
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
    );
}

export function selectDistractors(locale = "fr") {
  return db
    .select({
      tunisian: items.tunisian,
      translation: itemTranslations.translation,
    })
    .from(items)
    .leftJoin(
      itemTranslations,
      sql`${itemTranslations.itemId} = ${items.id} AND ${itemTranslations.locale} = ${locale}`,
    );
}
