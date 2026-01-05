"use client";

import { joinDal } from "@/data/join.dal";
import { useMutation } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Props {
  code: string;
}

export function JoinButton({ code }: Props) {
  const router = useRouter();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const {
    mutate: joinRoom,
    error,
    isPending,
  } = useMutation({
    mutationFn: async () => {
      return await joinDal.joinRoom(code);
    },
    onSuccess: (roomId) => {
      router.replace(`/room/${roomId}`);
    },
    onSettled: () => {
      setTimeRemaining(5);
    },
  });

  useEffect(() => {
    if (timeRemaining === null || timeRemaining < 0) return;

    if (timeRemaining === 0) {
      router.replace("/");
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  return (
    <div className="space-y-3">
      <button
        onClick={() => joinRoom()}
        disabled={isPending}
        className="w-full bg-green-600 hover:bg-green-500 text-white p-3 text-sm font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            UNIÉNDOTE...
          </>
        ) : (
          "UNIRSE A LA SALA"
        )}
      </button>

      {error && (
        <p className="text-red-500 text-xs text-center">
          {error instanceof Error
            ? error.message +
              ` (redireccionando en ${timeRemaining} segundos...)`
            : "Error al unirse a la sala"}
        </p>
      )}
    </div>
  );
}
