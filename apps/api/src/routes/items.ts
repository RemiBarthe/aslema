import { Hono } from "hono";
import { items as itemsTable } from "../db/schema";
import { eq, sql, ne, and } from "drizzle-orm";
import { selectDistractors } from "../db/queries/items";

const itemsRouter = new Hono();

itemsRouter.get("/random/:count", async (c) => {
  const count = parseInt(c.req.param("count"));
  const excludeId = c.req.query("excludeId");
  const lessonId = c.req.query("lessonId");
  const locale = c.req.query("locale") || "fr";

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

export { itemsRouter as items };
