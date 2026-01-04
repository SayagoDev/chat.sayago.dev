import { treaty } from "@elysiajs/eden";
import type { App } from "../app/api/[[...slugs]]/route";
import { env } from "./env";

// .api to enter /api prefix
const API_URL =
  process.env.NODE_ENV === "production" ? env.API_URL : "http://localhost:3000";
export const client = treaty<App>(API_URL).api;
