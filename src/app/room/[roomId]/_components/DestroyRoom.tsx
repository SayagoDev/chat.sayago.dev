import { roomDal } from "@/data/room.dal";
import { useMutation } from "@tanstack/react-query";
import { Loader2Icon, TrashIcon } from "lucide-react";

export function DestroyRoom({ roomId }: { roomId: string }) {
  const { mutate: destroyRoom, isPending } = useMutation({
    mutationFn: async () => {
      return await roomDal.destroy(roomId);
    },
  });

  return (
    <button
      onClick={() => destroyRoom()}
      disabled={isPending}
      className="text-xs bg-zinc-800 hover:bg-red-600 px-2 sm:px-3 py-1.5 rounded text-zinc-400 hover:text-white font-bold  transition-all group flex items-center gap-2 disabled:opacity-50 cursor-pointer"
    >
      <span className="group-hover:animate-pulse">
        {isPending ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <TrashIcon className="size-4 -translate-y-px" />
        )}
      </span>
      <span className="hidden sm:inline">
        {isPending ? "DESTRUYENDO..." : "DESTRUIR AHORA"}
      </span>
    </button>
  );
}
