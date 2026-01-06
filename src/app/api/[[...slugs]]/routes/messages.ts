import Elysia, { t } from "elysia";
import { authMiddleware } from "../auth";
import { redis } from "@/lib/redis";
import { nanoid } from "nanoid";
import { Message, realtime } from "@/lib/realtime";
import z from "zod";

export const messagesPlugin = new Elysia({ prefix: "/messages" })
  .post(
    "/delete",
    async ({ body, set }) => {
      const { roomId, token } = body;

      const allMessages = await redis.lrange<Message>(
        `messages:${roomId}`,
        0,
        -1
      );

      const idsToRemove = allMessages
        .filter((msg) => msg.token === token && msg.type !== "system")
        .map((msg) => JSON.stringify(msg));

      await Promise.all(
        idsToRemove.map((msgJson) =>
          redis.lrem(`messages:${roomId}`, 0, msgJson)
        )
      );

      return { success: true as const };
    },
    {
      body: z.object({
        roomId: z.string(),
        token: z.string(),
      }),
      response: {
        200: t.Object({ success: t.Literal(true) }),
        404: t.Object({ code: t.Literal("room-not-found") }),
      },
    }
  )
  .use(authMiddleware)
  .post(
    "/",
    async ({ body, auth, set }) => {
      const { sender, text, type = "message" } = body;
      const { roomId } = auth;

      const roomExists = await redis.exists(`meta:${roomId}`);

      if (!roomExists) {
        set.status = 404;
        return { code: "room-not-found" as const };
      }

      const message: Message = {
        id: nanoid(),
        sender,
        text,
        timestamp: Date.now(),
        roomId,
        type,
      };

      await redis.rpush(`messages:${roomId}`, {
        ...message,
        token: auth.token,
      });

      await realtime.channel(roomId).emit("chat.message", message);

      const remaining = await redis.ttl(`meta:${roomId}`);

      await Promise.all([
        redis.expire(`messages:${roomId}`, remaining),
        redis.expire(roomId, remaining),
      ]);

      return { success: true as const };
    },
    {
      query: z.object({
        roomId: z.string(),
      }),
      body: z.object({
        sender: z.string().max(100),
        text: z.string().max(50, {
          message: "El mensaje no puede tener más de 50 caracteres",
        }),
        type: z.enum(["message", "system"]).optional(),
      }),
      response: {
        200: t.Object({ success: t.Literal(true) }),
        404: t.Object({ code: t.Literal("room-not-found") }),
      },
    }
  )
  .get(
    "/",
    async ({ auth }) => {
      const messages = await redis.lrange<Message>(
        `messages:${auth.roomId}`,
        0,
        -1
      );

      return {
        messages: messages.map((m) => ({
          ...m,
          token: m.token === auth.token ? auth.token : undefined,
        })),
      };
    },
    {
      query: z.object({
        roomId: z.string(),
      }),
    }
  );
