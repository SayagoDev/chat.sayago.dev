import { roomDal } from "@/data/room.dal";
import { useActiveRooms } from "@/hooks/useActiveRooms";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function formatTimeRemaining(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function Autodestroy({
  roomId,
  className,
  fromLobby = false,
}: {
  roomId: string;
  className?: string;
  fromLobby?: boolean;
}) {
  const router = useRouter();
  const { removeRoom } = useActiveRooms();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const { data: ttlData } = useQuery({
    queryKey: ["ttl", roomId],
    queryFn: () => roomDal.ttl(roomId),
    refetchOnMount: "always",
  });

  useEffect(() => {
    if (ttlData?.ttl !== undefined) {
      setTimeRemaining(ttlData.ttl);
    }
  }, [ttlData]);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining < 0) return;

    if (timeRemaining === 0 && fromLobby) {
      removeRoom(roomId);
      return;
    }

    if (timeRemaining === 0) {
      router.push("/?destroyed=true");
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
  }, [timeRemaining, router, fromLobby, removeRoom, roomId]);

  return (
    <div className={cn("flex flex-col", className)}>
      {fromLobby ? (
        ""
      ) : (
        <span className="text-xs text-zinc-500 uppercase">Autodestrucción</span>
      )}
      <span
        className={`text-sm font-bold flex items-center gap-2 ${
          timeRemaining !== null && timeRemaining > 300 ? "text-green-500" : ""
        } ${
          timeRemaining !== null && timeRemaining < 60
            ? "text-red-500"
            : "text-amber-500"
        } ${
          timeRemaining !== null && timeRemaining < 10 ? "animate-pulse" : ""
        }`}
      >
        {timeRemaining !== null ? formatTimeRemaining(timeRemaining) : "--:--"}
      </span>
    </div>
  );
}
