"use client";

import type { ActiveRoom } from "@/hooks/useActiveRooms";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const STORAGE_KEY = "active-rooms";

interface Props {
  code: string;
}

export function JoinButton({ code }: Props) {
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    setIsJoining(true);
    setError(null);

    try {
      const res = await fetch(`/api/join/${code}`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();

        // Guardar token en localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        let rooms: ActiveRoom[] = [];
        if (stored) {
          try {
            rooms = JSON.parse(stored);
          } catch {
            rooms = [];
          }
        }
        // Agregar o actualizar
        const existingIndex = rooms.findIndex((r) => r.roomId === data.roomId);
        if (existingIndex >= 0) {
          rooms[existingIndex] = {
            roomId: data.roomId,
            token: data.token,
            joinedAt: Date.now(),
          };
        } else {
          rooms.push({
            roomId: data.roomId,
            token: data.token,
            joinedAt: Date.now(),
          });
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));

        router.replace(`/room/${data.roomId}`);
      } else {
        const data = await res.json();
        setError(data.error || "Error al unirse a la sala");
        setIsJoining(false);
      }
    } catch {
      setError("Error de conexión");
      setIsJoining(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleJoin}
        disabled={isJoining}
        className="w-full bg-green-600 hover:bg-green-500 text-white p-3 text-sm font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isJoining ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            ENTRANDO...
          </>
        ) : (
          "UNIRSE A LA SALA"
        )}
      </button>

      {error && <p className="text-red-500 text-xs text-center">{error}</p>}
    </div>
  );
}
