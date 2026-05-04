export const runtime = "nodejs";

import { Hono } from "hono";
import { auth } from "@/lib/auth";
import { cors } from "hono/cors";

const app = new Hono().basePath("/api");

app.use(
  "/*",
  cors({
    origin: ["http://localhost:3000", "https://example.org"],
  })
);
app.get("/hello", (c) => {
  return c.json({ message: "Hello from Hono!" });
});

app.on(["POST", "GET"], "/auth/**", (c) => auth.handler(c.req.raw));

export default app;
