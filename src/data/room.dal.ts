import { client } from "@/lib/client";
import { redis } from "@/lib/redis";
import { redirect } from "next/navigation";

export const roomDal = {
  async create() {
    const res = await client.room.create.post();

    if (res.status !== 200) {
      throw new Error(
        `Código de estado: ${res.status}` +
          (res.error ? ` Detalle: ${JSON.stringify(res.error)}` : "")
      );
    }

    if (!res.data?.roomId) {
      throw new Error("No se recibió un ID de sala válido. Volver a intentar.");
    }

    return res.data.roomId;
  },

  async invite(roomId: string) {
    const res = await client.room.invite.post(null, { query: { roomId } });
    if (res.status !== 200) {
      throw new Error(`Error al generar la invitación: ${res.status}`);
    }

    if (!res.data?.code) {
      throw new Error("No se pudo generar el código de invitación");
    }

    return res.data.code;
  },

  async destroy(roomId: string) {
    const res = await client.room.delete(null, { query: { roomId } });
  },

  async ttl(roomId: string) {
    const res = await client.room.ttl.get({ query: { roomId } });
    if (res.status !== 200) {
      throw new Error(`Error al obtener el TTL de la sala: ${res.status}`);
    }

    return res.data;
  },

  async getAllRooms(invite: { roomId: string; createdBy: string }) {
    const res = await redis.hgetall<{ connected: string[]; createdAt: number }>(
      `meta:${invite.roomId}`
    );

    if (!res) {
      redirect("/?error=room-not-found");
    }

    return res;
  },

  async getToken(roomId: string) {
    const res = await client.room.token.get({ query: { roomId } });

    if (res.status !== 200) {
      throw new Error("Error al obtener el token de la sala");
    }

    if (!res.data?.token) {
      throw new Error("Error al obtener el token de la sala");
    }

    return res.data.token;
  },

  async restoreRoom(roomId: string, token: string) {
    const res = await client.room.restore.post({ roomId, token });

    if (res.error) {
      if ("code" in res.error.value) {
        throw new Error(res.error.value.code);
      }
      throw new Error("validation-error");
    }

    return { roomId, success: true };
  },
};
