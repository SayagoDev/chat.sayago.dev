import { client } from "@/lib/client";

export const messageDal = {
  async post(username: string, text: string, roomId: string) {
    const res = await client.messages.post(
      {
        sender: username,
        text,
      },
      {
        query: { roomId },
      }
    );

    if (res.error) {
      const { message, code } = res.error.value as {
        code?: string;
        message?: string;
      };
      throw new Error(message || code || "Error al enviar el mensaje");
    }

    return { success: true };
  },

  async get(roomId: string) {
    const res = await client.messages.get({ query: { roomId } });

    if (res.status !== 200) {
      throw new Error(`Error al pedir los mensajes: ${res.status}`);
    }

    if (!res.data?.messages) {
      throw new Error(`No hay mensajes`);
    }

    return res.data.messages;
  },
};
