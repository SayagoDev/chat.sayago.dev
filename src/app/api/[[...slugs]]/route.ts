import { redis } from "@/lib/redis";
import { Elysia, t } from "elysia";
import { nanoid } from "nanoid";
import { authMiddleware } from "./auth";
import z from "zod";
import { Message, realtime } from "@/lib/realtime";

const ROOM_TTL_SECONDS = 60 * 10; // 10 minutes
const INVITE_TTL_SECONDS = 60 * 5; // 5 minutes

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Sin I, O, 0, 1 para evitar confusión
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const rooms = new Elysia({ prefix: "/room" })
  .post("/create", async () => {
    const roomId = nanoid();

    await redis.hset(`meta:${roomId}`, {
      connected: [],
      createdAt: Date.now(),
    });

    await redis.expire(`meta:${roomId}`, ROOM_TTL_SECONDS);

    return { roomId };
  })
  .post(
    "/join",
    async ({ body }) => {
      const { code } = body;

      // Obtener y eliminar la invitación (un solo uso)
      const invite = await redis.get<{ roomId: string; createdBy: string }>(
        `invite:${code}`
      );

      if (!invite) {
        throw new Error("Invalid or expired invite code");
      }

      // Verificar que la sala existe
      const meta = await redis.hgetall<{
        connected: string[];
        createdAt: number;
      }>(`meta:${invite.roomId}`);

      if (!meta) {
        await redis.del(`invite:${code}`);
        throw new Error("Room no longer exists");
      }

      const connected = Array.isArray(meta.connected) ? meta.connected : [];

      // Verificar que la sala no está llena
      if (connected.length >= 2) {
        throw new Error("Room is full");
      }

      // Eliminar invitación (un solo uso)
      await redis.del(`invite:${code}`);
      await redis.srem(`invites:${invite.roomId}`, code);

      // Crear token para el nuevo usuario
      const token = nanoid();

      // Agregar token a connected
      await redis.hset(`meta:${invite.roomId}`, {
        connected: [...connected, token],
      });

      return { roomId: invite.roomId, token };
    },
    {
      body: z.object({
        code: z.string().length(8),
      }),
    }
  )
  .use(authMiddleware)
  .get(
    "/ttl",
    async ({ auth }) => {
      const ttl = await redis.ttl(`meta:${auth.roomId}`);

      return { ttl: ttl > 0 ? ttl : 0 };
    },
    {
      query: z.object({
        roomId: z.string(),
      }),
    }
  )
  .post(
    "/invite",
    async ({ auth }) => {
      const code = generateInviteCode();

      await redis.set(
        `invite:${code}`,
        {
          roomId: auth.roomId,
          createdBy: auth.token,
        },
        { ex: INVITE_TTL_SECONDS }
      );

      // Guardar referencia del código en la sala para poder eliminarlo después
      await redis.sadd(`invites:${auth.roomId}`, code);
      const ttl = await redis.ttl(`meta:${auth.roomId}`);
      if (ttl > 0) {
        await redis.expire(`invites:${auth.roomId}`, ttl);
      }

      return { code };
    },
    {
      query: z.object({
        roomId: z.string(),
      }),
    }
  )
  .delete(
    "/",
    async ({ auth }) => {
      await realtime
        .channel(auth.roomId)
        .emit("chat.destroy", { isDestroyed: true });

      // Obtener y eliminar todos los códigos de invitación pendientes
      const inviteCodes = await redis.smembers(`invites:${auth.roomId}`);
      const inviteDeletes = inviteCodes.map((code) =>
        redis.del(`invite:${code}`)
      );

      await Promise.all([
        redis.del(auth.roomId),
        redis.del(`meta:${auth.roomId}`),
        redis.del(`messages:${auth.roomId}`),
        redis.del(`invites:${auth.roomId}`),
        ...inviteDeletes,
      ]);
    },
    {
      query: z.object({
        roomId: z.string(),
      }),
    }
  );

const messages = new Elysia({ prefix: "/messages" })
  .use(authMiddleware)
  .post(
    "/",
    async ({ body, auth }) => {
      const { sender, text } = body;
      const { roomId } = auth;

      const roomExists = await redis.exists(`meta:${roomId}`);

      if (!roomExists) {
        throw new Error("Room does not exist");
      }

      const message: Message = {
        id: nanoid(),
        sender,
        text,
        timestamp: Date.now(),
        roomId,
      };

      // add message to history
      await redis.rpush(`messages:${roomId}`, {
        ...message,
        token: auth.token,
      });
      await realtime.channel(roomId).emit("chat.message", message);

      const remaining = await redis.ttl(`meta:${roomId}`);

      await Promise.all([
        redis.expire(`messages:${roomId}`, remaining),
        redis.expire(`history:${roomId}`, remaining),
        redis.expire(roomId, remaining),
      ]);
    },
    {
      query: z.object({
        roomId: z.string(),
      }),
      body: z.object({
        sender: z.string().max(100),
        text: z.string().max(1000),
      }),
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

const app = new Elysia({ prefix: "/api" }).use(rooms).use(messages);

export type App = typeof app;

export const GET = app.fetch;
export const POST = app.fetch;
export const DELETE = app.fetch;
