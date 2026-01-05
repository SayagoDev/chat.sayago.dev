"use client";

import { useActiveRooms } from "@/hooks/useActiveRooms";
import { SoundType, useSound } from "@/hooks/useSound";
import { useUsername } from "@/hooks/useUsername";
import { useRealtime } from "@/lib/realtime-client";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Autodestroy } from "./_components/Autodestroy";
import { DestroyRoom } from "./_components/DestroyRoom";
import { SendMessage } from "./_components/SendMessage";
import { ShareLink } from "./_components/ShareLink";
import { ShowMessages } from "./_components/ShowMessages";
import { messageDal } from "@/data/message.dal";
import { roomDal } from "@/data/room.dal";

export default function RoomPage() {
  const { username } = useUsername();
  const { addRoom, removeRoom } = useActiveRooms();

  const { playSound } = useSound();
  const router = useRouter();

  const params = useParams();
  const roomId = params.roomId as string;

  // Obtener token y guardarlo en localStorage
  const { data: token } = useQuery({
    queryKey: ["token", roomId],
    queryFn: async () => roomDal.getToken(roomId),
  });

  const { data: messages, refetch } = useQuery({
    queryKey: ["messages", roomId],
    queryFn: () => messageDal.get(roomId),
  });

  useEffect(() => {
    if (token) {
      addRoom(roomId, token);
    }
  }, [roomId, token, addRoom]);

  useRealtime({
    channels: [roomId],
    events: ["chat.message", "chat.destroy"],
    onData: ({ event, data }) => {
      if (event === "chat.message") {
        refetch();
        // Reproducir sonido solo si el mensaje no es del usuario actual
        if (data?.sender !== username) {
          playSound(SoundType.Receive);
        }
      }

      if (event === "chat.destroy") {
        playSound(SoundType.Destroy);
        removeRoom(roomId);
        setTimeout(() => {
          router.push("/?destroyed=true");
        }, 700);
      }
    },
  });

  return (
    <main className="flex flex-col h-dvh max-h-dvh overflow-hidden">
      <header className="border-b border-zinc-800 p-4 flex items-center justify-between bg-zinc-900/30">
        <div className="flex items-center gap-4">
          <ShareLink roomId={roomId} />

          <div className="h-8 w-px bg-zinc-800" />

          <Autodestroy roomId={roomId} />
        </div>
        <DestroyRoom roomId={roomId} />
      </header>

      <ShowMessages messages={messages} username={username} />

      <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
        <SendMessage roomId={roomId} username={username} />
      </div>
    </main>
  );
}
