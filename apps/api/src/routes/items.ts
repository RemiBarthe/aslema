import { Hono } from "hono";
import { items as itemsTable, itemTranslations } from "../db/schema";
import { eq, sql, ne, and, isNull } from "drizzle-orm";
import { selectDistractors } from "../db/queries/items";
import { DEFAULT_LOCALE } from "@aslema/shared";
import { db } from "../db";

const itemsRouter = new Hono();

itemsRouter.get("/random/:count", async (c) => {
  const count = parseInt(c.req.param("count"));
  const excludeId = c.req.query("excludeId");
  const lessonId = c.req.query("lessonId");
  const locale = c.req.query("locale") || DEFAULT_LOCALE;

  const conditions = [];
  if (excludeId) {
    conditions.push(ne(itemsTable.id, parseInt(excludeId)));
  }
  if (lessonId) {
    conditions.push(eq(itemsTable.lessonId, parseInt(lessonId)));
  }

  const result = await selectDistractors(locale)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`RANDOM()`)
    .limit(count);

  return c.json({ success: true, data: result });
});

// Get a random item without audio
itemsRouter.get("/random-without-audio", async (c) => {
  const locale = c.req.query("locale") || DEFAULT_LOCALE;

  const result = await db
    .select({
      id: itemsTable.id,
      tunisian: itemsTable.tunisian,
      translation: itemTranslations.translation,
    })
    .from(itemsTable)
    .leftJoin(
      itemTranslations,
      and(
        eq(itemsTable.id, itemTranslations.itemId),
        eq(itemTranslations.locale, locale)
      )
    )
    .where(isNull(itemsTable.audioFile))
    .orderBy(sql`RANDOM()`)
    .limit(1);

  return c.json({
    success: true,
    data: result.length > 0 ? result[0] : null,
  });
});

// Create a new item
itemsRouter.post("/", async (c) => {
  const body = await c.req.json();
  const {
    tunisian,
    translation,
    type = "word",
    difficulty = 1,
    audioFile,
    lessonId,
    locale = DEFAULT_LOCALE
  } = body;

  if (!tunisian || !translation) {
    return c.json(
      { success: false, error: "tunisian and translation are required" },
      400
    );
  }

  // Insert item
  const itemResult = await db
    .insert(itemsTable)
    .values({
      tunisian,
      type,
      difficulty,
      audioFile: audioFile || null,
      lessonId: lessonId || null,
    })
    .returning({ id: itemsTable.id });

  const itemId = itemResult[0].id;

  // Insert translation
  await db.insert(itemTranslations).values({
    itemId,
    locale,
    translation,
  });

  return c.json({
    success: true,
    data: { id: itemId },
  });
});

// Update item audio
itemsRouter.patch("/:id/audio", async (c) => {
  const id = parseInt(c.req.param("id"));
  const body = await c.req.json();
  const { audioFile } = body;

  if (!audioFile) {
    return c.json(
      { success: false, error: "audioFile is required" },
      400
    );
  }

  await db
    .update(itemsTable)
    .set({ audioFile })
    .where(eq(itemsTable.id, id));

  return c.json({
    success: true,
    data: { success: true },
  });
});

export { itemsRouter as items };
