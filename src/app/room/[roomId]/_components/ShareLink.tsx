import { roomDal } from "@/data/room.dal";
import { SoundType, useSound } from "@/hooks/useSound";
import { useMutation } from "@tanstack/react-query";
import { CheckIcon, LinkIcon, Loader2Icon, XIcon } from "lucide-react";
import { useState } from "react";

export function ShareLink({ roomId }: { roomId: string }) {
  const [copyStatus, setCopyStatus] = useState<
    "invitar" | "generando" | "copiado" | "error"
  >("invitar");
  const { playSound } = useSound();

  const { mutate: copyLink } = useMutation({
    mutationFn: async () => {
      setCopyStatus("generando");
      return await roomDal.invite(roomId);
    },
    onSuccess: async (code) => {
      const url = window.location.origin + "/join/" + code;
      await navigator.clipboard.writeText(url);
      setCopyStatus("copiado");
      playSound(SoundType.Copy);
    },
    onError: () => {
      setCopyStatus("error");
      playSound(SoundType.Error);
    },
    onSettled: () => {
      setTimeout(() => {
        setCopyStatus("invitar");
      }, 2000);
    },
  });

  return (
    <button
      className="flex items-center gap-2 text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={() => copyLink()}
      disabled={copyStatus === "generando"}
    >
      {copyStatus === "copiado" && (
        <CheckIcon className="size-4 text-green-500" />
      )}
      {copyStatus === "generando" && (
        <Loader2Icon className="size-4 animate-spin" />
      )}
      {copyStatus === "invitar" && <LinkIcon className="size-4" />}
      {copyStatus === "error" && <XIcon className="size-4 text-red-500" />}
      <span className="uppercase font-bold">{copyStatus}</span>
    </button>
  );
}
