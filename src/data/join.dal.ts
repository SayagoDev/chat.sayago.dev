import { ActiveRoom } from "@/hooks/useActiveRooms";
import { client } from "@/lib/client";
import { STORAGE_KEY_ACTIVE_ROOMS } from "@/lib/constants";
import { redis } from "@/lib/redis";
import { redirect } from "next/navigation";

export const joinDal = {
  async getInvitation(code: string) {
    const invite = await redis.get<{ roomId: string; createdBy: string }>(
      `invite:${code}`
    );

    if (!invite) {
      redirect("/?error=invalid-invite");
    }

    return invite;
  },

  async joinRoom(code: string) {
    const res = await client.join({ code: code }).post();

    if (res.error) {
      if ("code" in res.error.value) {
        throw new Error(res.error.value.code);
      }
      throw new Error("validation-error");
    }

    // save token in localStorage
    const stored = localStorage.getItem(STORAGE_KEY_ACTIVE_ROOMS);
    let rooms: ActiveRoom[] = [];
    if (stored) {
      try {
        rooms = JSON.parse(stored);
      } catch {
        rooms = [];
      }
    }

    // add or update
    const existingIndex = rooms.findIndex((r) => r.roomId === res.data.roomId);
    if (existingIndex >= 0) {
      rooms[existingIndex] = {
        roomId: res.data.roomId,
        token: res.data.token,
        joinedAt: Date.now(),
      };
    } else {
      rooms.push({
        roomId: res.data.roomId,
        token: res.data.token,
        joinedAt: Date.now(),
      });
    }
    localStorage.setItem(STORAGE_KEY_ACTIVE_ROOMS, JSON.stringify(rooms));

    return res.data.roomId;
  },
};
