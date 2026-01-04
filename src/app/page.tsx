"use client";

import { useUsername } from "@/hooks/useUsername";
import { client } from "@/lib/client";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useSound } from "@/hooks/useSound";
import { Suspense } from "react";

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
  const searchParams = useSearchParams();
  const wasDestroyed = searchParams.get("destroyed") === "true";
  const error = searchParams.get("error");

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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
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
                Tú identidad
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
      </div>
    </main>
  );
}

export default Page;
