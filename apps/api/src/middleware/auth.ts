import type { Context, Next } from "hono";

// Type augmentation for Hono context
type Variables = {
  userId: string;
};

/**
 * Extracts userId from X-User-Id header and attaches it to the context
 * Returns 400 if header is missing
 */
export async function requireUserId(
  c: Context<{ Variables: Variables }>,
  next: Next
) {
  const userId = c.req.header("X-User-Id");

  if (!userId) {
    return c.json({ success: false, error: "X-User-Id header required" }, 400);
  }

  // Attach userId to context for use in route handlers
  c.set("userId", userId);

  await next();
}

/**
 * Extracts userId from X-User-Id header or defaults to "anonymous"
 * Never returns 400 - always proceeds with either the userId or "anonymous"
 */
export async function optionalUserId(
  c: Context<{ Variables: Variables }>,
  next: Next
) {
  const userId = c.req.header("X-User-Id") || "anonymous";

  // Attach userId to context for use in route handlers
  c.set("userId", userId);

  await next();
}
