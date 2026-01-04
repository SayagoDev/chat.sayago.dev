"use client";

import { useActiveRooms } from "@/hooks/useActiveRooms";
import { useUsername } from "@/hooks/useUsername";
import { client } from "@/lib/client";
import { useMutation } from "@tanstack/react-query";
import { ArrowRightIcon, Loader2Icon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSound } from "@/hooks/useSound";
import { Suspense, useState } from "react";

const Page = () => {
  return (
    <Suspense>
      <Lobby />
    </Suspense>
  );
};

function Lobby() {
  const router = useRouter();
  const { username } = useUsername();
  const { playSound } = useSound();
  const { rooms, removeRoom } = useActiveRooms();
  const searchParams = useSearchParams();
  const wasDestroyed = searchParams.get("destroyed") === "true";
  const error = searchParams.get("error");
  const [enteringRoom, setEnteringRoom] = useState<string | null>(null);

  const { mutate: createRoom } = useMutation({
    mutationFn: async () => {
      const res = await client.room.create.post();

      if (res.status === 200) {
        playSound("success");
        router.push(`/room/${res.data?.roomId}`);
      }
    },
    onError: () => {
      playSound("error");
    },
  });

  const enterRoom = async (roomId: string, token: string) => {
    setEnteringRoom(roomId);
    try {
      const res = await client.room.restore.post({ roomId, token });
      if (res.status === 200) {
        router.push(`/room/${roomId}`);
      } else {
        // Token inválido o sala no existe, remover de la lista
        removeRoom(roomId);
        playSound("error");
      }
    } catch {
      removeRoom(roomId);
      playSound("error");
    } finally {
      setEnteringRoom(null);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {wasDestroyed && (
          <div className="bg-red-950/50 border border-red-900 p-4 text-center">
            <p className="text-red-500 text-sm font-bold">SALA DESTRUIDA</p>
            <p className="text-zinc-500 text-xs mt-1">
              Todos los mensajes han sido eliminados.
            </p>
          </div>
        )}
        {error === "room-not-found" && (
          <div className="bg-red-950/50 border border-red-900 p-4 text-center">
            <p className="text-red-500 text-sm font-bold">SALA NO ENCONTRADA</p>
            <p className="text-zinc-500 text-xs mt-1">
              La sala que estás buscando no existe. O ha sido destruida.
            </p>
          </div>
        )}
        {error === "room-is-full" && (
          <div className="bg-red-950/50 border border-red-900 p-4 text-center">
            <p className="text-red-500 text-sm font-bold">SALA LLENA</p>
            <p className="text-zinc-500 text-xs mt-1">
              La sala que estás buscando está llena.
            </p>
          </div>
        )}
        {error === "invalid-invite" && (
          <div className="bg-red-950/50 border border-red-900 p-4 text-center">
            <p className="text-red-500 text-sm font-bold">
              INVITACIÓN INVÁLIDA
            </p>
            <p className="text-zinc-500 text-xs mt-1">
              El código de invitación es inválido o ha expirado.
            </p>
          </div>
        )}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-green-500">
            {">"}chat_privado
          </h1>
          <p className="text-zinc-500 text-sm">
            Un chat privado que se autodestruye
          </p>
        </div>
        <div className="border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-md">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="flex items-center text-zinc-500">
                Tu identidad
              </label>

              <div className="flex items-center gap-3">
                <div className="flex-1 bg-zinc-950 border border-zinc-800 p-3 text-sm text-zinc-400 font-mono">
                  {username}
                </div>
              </div>
            </div>

            <button
              onClick={() => createRoom()}
              className="w-full bg-zinc-100 text-black p-3 text-sm font-bold hover:bg-zinc-50 hover:text-black transition-colors mt-2 cursor-pointer disabled:opacity-50"
            >
              CREAR SALA SEGURA
            </button>
          </div>
        </div>

        {rooms.length > 0 && (
          <div className="border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-md">
            <p className="text-xs text-zinc-500 uppercase mb-3">
              Salas activas
            </p>
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
      </div>
    </main>
  );
}

export default Page;
