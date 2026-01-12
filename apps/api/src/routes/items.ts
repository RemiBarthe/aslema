import { Hono } from "hono";
import { db } from "../db";
import { items as itemsTable, itemTranslations } from "../db/schema";
import { eq, sql, ne, and } from "drizzle-orm";

const itemsRouter = new Hono();

// Get all items
itemsRouter.get("/", async (c) => {
  const locale = c.req.query("locale") || "fr";
  const limit = parseInt(c.req.query("limit") || "50");

  const result = await db
    .select({
      id: itemsTable.id,
      lessonId: itemsTable.lessonId,
      type: itemsTable.type,
      tunisian: itemsTable.tunisian,
      audioFile: itemsTable.audioFile,
      difficulty: itemsTable.difficulty,
      orderIndex: itemsTable.orderIndex,
      translation: itemTranslations.translation,
    })
    .from(itemsTable)
    .leftJoin(
      itemTranslations,
      sql`${itemTranslations.itemId} = ${itemsTable.id} AND ${itemTranslations.locale} = ${locale}`
    )
    .limit(limit);

  return c.json({ success: true, data: result });
});

// Get single item
itemsRouter.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const locale = c.req.query("locale") || "fr";

  const [item] = await db
    .select({
      id: itemsTable.id,
      lessonId: itemsTable.lessonId,
      type: itemsTable.type,
      tunisian: itemsTable.tunisian,
      audioFile: itemsTable.audioFile,
      difficulty: itemsTable.difficulty,
      orderIndex: itemsTable.orderIndex,
      translation: itemTranslations.translation,
    })
    .from(itemsTable)
    .leftJoin(
      itemTranslations,
      sql`${itemTranslations.itemId} = ${itemsTable.id} AND ${itemTranslations.locale} = ${locale}`
    )
    .where(eq(itemsTable.id, id));

  if (!item) {
    return c.json({ success: false, error: "Item not found" }, 404);
  }

  return c.json({ success: true, data: item });
});

// Get random items (for QCM distractors)
itemsRouter.get("/random/:count", async (c) => {
  const count = parseInt(c.req.param("count"));
  const excludeId = c.req.query("excludeId");
  const lessonId = c.req.query("lessonId");
  const locale = c.req.query("locale") || "fr";

  // Build conditions
  const conditions = [];
  if (excludeId) {
    conditions.push(ne(itemsTable.id, parseInt(excludeId)));
  }
  if (lessonId) {
    conditions.push(eq(itemsTable.lessonId, parseInt(lessonId)));
  }

  const result = await db
    .select({
      id: itemsTable.id,
      tunisian: itemsTable.tunisian,
      translation: itemTranslations.translation,
    })
    .from(itemsTable)
    .leftJoin(
      itemTranslations,
      sql`${itemTranslations.itemId} = ${itemsTable.id} AND ${itemTranslations.locale} = ${locale}`
    )
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`RANDOM()`)
    .limit(count);

  return c.json({ success: true, data: result });
});

export { itemsRouter as items };
