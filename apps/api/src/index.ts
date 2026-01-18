import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { lessons } from "./routes/lessons";
import { items } from "./routes/items";
import { reviews } from "./routes/reviews";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:4173", "http://localhost:5174"],
    credentials: true,
  })
);

// Health check
app.get("/", (c) => c.json({ status: "ok", message: "Tunisian API 🇹🇳" }));

// Routes
app.route("/lessons", lessons);
app.route("/items", items);
app.route("/reviews", reviews);

// Start server
const port = process.env.PORT || 3000;
console.log(`🚀 Server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
