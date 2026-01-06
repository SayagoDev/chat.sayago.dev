import { Autodestroy } from "@/app/room/[roomId]/_components/Autodestroy";
import { messageDal } from "@/data/message.dal";
import { roomDal } from "@/data/room.dal";
import { useUsername } from "@/hooks/useUsername";
import { ActiveRoom, useActiveRooms } from "@/hooks/useActiveRooms";
import { SoundType, useSound } from "@/hooks/useSound";
import { useMutation } from "@tanstack/react-query";
import { ArrowRightIcon, ClockIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ShowRooms() {
  const { rooms, removeRoom } = useActiveRooms();
  const { username } = useUsername();
  const { playSound } = useSound();
  const router = useRouter();

  // Estado para trackear qué sala específica está siendo procesada
  const [enteringRoomId, setEnteringRoomId] = useState<string | null>(null);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 480;

  const { mutate: enterRoom } = useMutation({
    mutationFn: async ({
      roomId,
      token,
    }: Pick<ActiveRoom, "roomId" | "token">) => {
      setEnteringRoomId(roomId);
      return await roomDal.restoreRoom(roomId, token);
    },
    onSuccess: ({ roomId }) => {
      router.push(`/room/${roomId}`);
    },
    onError: (error, { roomId }) => {
      removeRoom(roomId);
      playSound(SoundType.Error);
      router.push(`/?error=${error.message}`);
    },
    onSettled: () => {
      setEnteringRoomId(null);
    },
  });

  const { mutate: deleteToken } = useMutation({
    mutationFn: async ({
      roomId,
      token,
    }: Pick<ActiveRoom, "roomId" | "token">) => {
      setDeletingRoomId(roomId);

      // Primero enviar mensaje de sistema usando el token guardado
      await messageDal.postSystem(
        username,
        "se ha salido de la sala",
        roomId,
        token
      );

      // Luego eliminar token y mensajes en paralelo
      await Promise.all([
        roomDal.deleteToken(roomId, token),
        messageDal.deleteMessages(roomId, token),
      ]);
    },
    onSuccess: (_, { roomId }) => {
      playSound(SoundType.Success);
      removeRoom(roomId);
    },
    onError: (error) => {
      playSound(SoundType.Error);
      router.push(`/?error=${error.message}`);
    },
    onSettled: () => {
      setDeletingRoomId(null);
    },
  });

  return (
    <>
      {rooms.length > 0 && (
        <div className="border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-md">
          <p className="text-xs text-zinc-500 uppercase mb-3">Salas activas</p>
          <div className="space-y-2">
            {rooms.map((room) => (
              <div
                key={room.roomId}
                className="flex items-center justify-between bg-zinc-950 border border-zinc-800 p-3"
              >
                <div className="flex items-center gap-1">
                  <ClockIcon className="size-4 text-zinc-500" />
                  <Autodestroy
                    roomId={room.roomId}
                    className="flex-row gap-2 items-center bg-zinc-950 p-1"
                    fromLobby={true}
                  />
                </div>
                <span className="text-sm text-zinc-400 font-mono truncate max-w-[180px]">
                  {isMobile
                    ? `${room.roomId.slice(0, 3)}...${room.roomId.slice(-3)}`
                    : room.roomId}
                </span>
                <div className="flex items-center gap-3">
                  {deletingRoomId === room.roomId ? (
                    <span className="w-[46px] inline-flex items-center justify-center">
                      <Loader2Icon className="size-4 animate-spin mr-2 translate-y-px" />
                    </span>
                  ) : (
                    <button
                      onClick={() =>
                        deleteToken({ roomId: room.roomId, token: room.token })
                      }
                      disabled={
                        deletingRoomId !== null || enteringRoomId !== null
                      }
                      className="w-[42px] inline-flex items-center justify-center text-xs text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer ml-1 disabled:opacity-50"
                    >
                      olvidar
                    </button>
                  )}
                  {enteringRoomId === room.roomId ? (
                    <span className="w-[62px] inline-flex items-center justify-center">
                      <Loader2Icon className="size-4 animate-spin mr-2 translate-y-px text-green-500" />
                    </span>
                  ) : (
                    <button
                      onClick={() =>
                        enterRoom({ roomId: room.roomId, token: room.token })
                      }
                      disabled={
                        enteringRoomId !== null || deletingRoomId !== null
                      }
                      className="w-[62px] flex items-center gap-1 justify-center text-xs text-green-500 hover:text-green-400 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <span>entrar</span>
                      <ArrowRightIcon className="size-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
