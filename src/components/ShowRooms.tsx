import { useActiveRooms } from "@/hooks/useActiveRooms";
import { SoundType, useSound } from "@/hooks/useSound";
import { client } from "@/lib/client";
import { ArrowRightIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ShowRooms() {
  const [enteringRoom, setEnteringRoom] = useState<string | null>(null);

  const { rooms, removeRoom } = useActiveRooms();
  const { playSound } = useSound();

  const router = useRouter();

  const enterRoom = async (roomId: string, token: string) => {
    setEnteringRoom(roomId);
    try {
      const res = await client.room.restore.post({ roomId, token });
      if (res.status === 200) {
        router.push(`/room/${roomId}`);
      } else {
        // Token inválido o sala no existe, remover de la lista
        removeRoom(roomId);
        playSound(SoundType.Error);
      }
    } catch {
      removeRoom(roomId);
      playSound(SoundType.Error);
    } finally {
      setEnteringRoom(null);
    }
  };

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
                <span className="text-sm text-zinc-400 font-mono truncate max-w-[180px]">
                  {room.roomId}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => removeRoom(room.roomId)}
                    className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    olvidar
                  </button>
                  <button
                    onClick={() => enterRoom(room.roomId, room.token)}
                    disabled={enteringRoom === room.roomId}
                    className="flex items-center gap-1 text-xs text-green-500 hover:text-green-400 transition-colors disabled:opacity-50"
                  >
                    {enteringRoom === room.roomId ? (
                      <Loader2Icon className="size-3 animate-spin" />
                    ) : (
                      <>
                        entrar
                        <ArrowRightIcon className="size-3" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
