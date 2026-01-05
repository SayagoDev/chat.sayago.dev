import { redis } from "@/lib/redis";
import Elysia, { t } from "elysia";
import { nanoid } from "nanoid";
import { API_CONFIG } from "../config";
import { authMiddleware } from "../auth";
import { realtime } from "@/lib/realtime";
import z from "zod";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const roomsPlugin = new Elysia({ prefix: "/room" })
  .post("/create", async () => {
    const roomId = nanoid();

    await redis.hset(`meta:${roomId}`, {
      connected: [],
      createdAt: Date.now(),
    });

    await redis.expire(`meta:${roomId}`, API_CONFIG.ROOM_TTL_SECONDS);

    return { roomId };
  })
  .post(
    "/restore",
    async ({ body, cookie, set }) => {
      const { roomId, token } = body;

      const meta = await redis.hgetall<{
        connected: string[];
        createdAt: number;
      }>(`meta:${roomId}`);

      if (!meta) {
        set.status = 404;
        return { code: "room-not-found" as const };
      }

      if (!meta.connected.includes(token)) {
        set.status = 400;
        return { code: "invalid-token" as const };
      }

      cookie["x-auth-token"].value = token;
      cookie["x-auth-token"].path = "/";
      cookie["x-auth-token"].httpOnly = true;
      cookie["x-auth-token"].secure = process.env.NODE_ENV === "production";
      cookie["x-auth-token"].sameSite = "strict";
      cookie["x-auth-token"].maxAge = 60 * 10;

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
        400: t.Object({ code: t.Literal("invalid-token") }),
      },
    }
  )
  .use(authMiddleware)
  .get(
    "/token",
    async ({ auth }) => {
      return { token: auth.token };
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
        {
          ex: API_CONFIG.INVITE_TTL_SECONDS,
        }
      );

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
