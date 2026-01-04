import { client } from "@/lib/client";

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
};
