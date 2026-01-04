"use client";

import { ShowErrors } from "@/components/ShowErrors";
import { ShowRooms } from "@/components/ShowRooms";
import { roomDal } from "@/data/room.dal";
import { SoundType, useSound } from "@/hooks/useSound";
import { useUsername } from "@/hooks/useUsername";
import { useMutation } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";

const Page = () => {
  return (
    <Suspense>
      <Lobby />
    </Suspense>
  );
};

function Lobby() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { username } = useUsername();
  const { playSound } = useSound();

  const router = useRouter();

  const { mutate: createRoom, isPending } = useMutation({
    mutationFn: async () => {
      return await roomDal.create();
    },
    onSuccess: (roomId) => {
      playSound(SoundType.Success);
      router.push(`/room/${roomId}`);
    },
    onError: (error) => {
      playSound(SoundType.Error);
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo crear la sala"
      );

      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <ShowErrors
          customError={
            errorMessage
              ? {
                  title: "ERROR AL CREAR SALA",
                  message: errorMessage,
                }
              : null
          }
        />

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
              disabled={isPending}
              className="w-full bg-zinc-100 text-black p-3 text-sm font-bold hover:bg-zinc-50 hover:text-black transition-colors mt-2 cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <span className="flex items-center justify-center gap-2">
                    <Loader2Icon className="size-4 animate-spin" />
                    CREANDO SALA...
                  </span>
                </>
              ) : (
                "CREAR SALA SEGURA"
              )}
            </button>
          </div>
        </div>

        <ShowRooms />
      </div>
    </main>
  );
}

export default Page;
