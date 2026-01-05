import { Elysia } from "elysia";
import { messagesPlugin } from "./routes/messages";
import { roomsPlugin } from "./routes/rooms";
import { joinPlugin } from "./routes/join";

const app = new Elysia({ prefix: "/api" })
  .onError(({ code, error, set }) => {
    const message = error instanceof Error ? error.message : String(error);
    // console.error(`[API Error] ${code}:`, message);

    // Errores de validación (Zod/Typebox)
    if (code === "VALIDATION") {
      set.status = 422;

      const validationError = error as any;

      return {
        error: "Validation Error",
        message:
          validationError?.customError ||
          validationError?.valueError?.message ||
          message ||
          "Los datos enviados no son válidos",
        code: "validation-error",
        field: validationError?.valueError?.path?.[0],
      };
    }

    // Endpoint no encontrado
    if (code === "NOT_FOUND") {
      set.status = 404;
      return {
        error: "Not Found",
        message: "Endpoint no encontrado",
        code: "endpoint-not-found",
      };
    }

    // Errores inesperados
    set.status = 500;
    return {
      error: "Internal Server Error",
      message:
        process.env.NODE_ENV === "production"
          ? "Error interno del servidor"
          : message,
      code: "internal-error",
    };
  })
  .use(roomsPlugin)
  .use(messagesPlugin)
  .use(joinPlugin);

export type App = typeof app;

export const GET = app.fetch;
export const POST = app.fetch;
export const DELETE = app.fetch;
