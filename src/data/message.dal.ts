import { client } from "@/lib/client";

export const messageDal = {
  async post(
    username: string,
    text: string,
    roomId: string,
    type: "message" | "system" = "message"
  ) {
    const res = await client.messages.post(
      {
        sender: username,
        text,
        type,
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
  async deleteMessages(roomId: string, token: string) {
    const res = await client.messages["delete"].post({
      roomId,
      token,
    });

    if (res.error) {
      if ("code" in res.error.value) {
        throw new Error(res.error.value.code);
      }
      throw new Error("validation-error");
    }

    return res.data;
  },
};
