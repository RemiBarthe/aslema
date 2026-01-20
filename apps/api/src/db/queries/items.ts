import { db } from "../index";
import { items, itemTranslations } from "../schema";
import { sql } from "drizzle-orm";
import { DEFAULT_LOCALE } from "@aslema/shared";

export function selectStudyItems(locale = DEFAULT_LOCALE) {
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

export function selectDistractors(locale = DEFAULT_LOCALE) {
  return db
    .select({
      tunisian: items.tunisian,
      translation: itemTranslations.translation,
      audioFile: items.audioFile,
    })
    .from(items)
    .leftJoin(
      itemTranslations,
      sql`${itemTranslations.itemId} = ${items.id} AND ${itemTranslations.locale} = ${locale}`,
    );
}
