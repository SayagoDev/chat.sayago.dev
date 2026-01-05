import { joinDal } from "@/data/join.dal";
import { roomDal } from "@/data/room.dal";
import { redis } from "@/lib/redis";
import Elysia, { redirect, t } from "elysia";
import { nanoid } from "nanoid";
import z from "zod";

export const joinPlugin = new Elysia({ prefix: "/join" }).post(
  "/:code",
  async ({ params, cookie }) => {
    const { code } = params;
    const upperCode = code.toUpperCase();

    const invite = await joinDal.getInvitation(upperCode);

    const meta = await roomDal.getAllRooms(invite);

    if (!meta) {
      await Promise.all([
        redis.del(`invite:${upperCode}`),
        redis.srem(`invites:${invite.roomId}`, upperCode),
      ]);
      return { code: "room-not-found" as const };
    }

    if (meta.connected.length >= 2) {
      return { code: "room-is-full" as const };
    }

    await Promise.all([
      redis.del(`invite:${upperCode}`),
      redis.srem(`invites:${invite.roomId}`, upperCode),
    ]);

    const token = nanoid();

    await redis.hset(`meta:${invite.roomId}`, {
      connected: [...meta.connected, token],
    });

    cookie["x-auth-token"].value = token;
    cookie["x-auth-token"].path = "/";
    cookie["x-auth-token"].httpOnly = true;
    cookie["x-auth-token"].secure = process.env.NODE_ENV === "production";
    cookie["x-auth-token"].sameSite = "strict";
    cookie["x-auth-token"].maxAge = 60 * 10;

    return { roomId: invite.roomId, token };
  },
  {
    params: z.object({
      code: z.string().length(8),
    }),
    response: {
      200: t.Object({ roomId: t.String(), token: t.String() }),
      404: t.Object({ code: t.Literal("room-not-found") }),
      400: t.Object({ code: t.Literal("room-is-full") }),
    },
  }
);
