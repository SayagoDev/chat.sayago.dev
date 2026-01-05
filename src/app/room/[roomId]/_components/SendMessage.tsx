"use client";

import { messageDal } from "@/data/message.dal";
import { SoundType, useSound } from "@/hooks/useSound";
import { useMutation } from "@tanstack/react-query";
import { Loader2Icon, SendIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function SendMessage({
  roomId,
  username,
}: {
  roomId: string;
  username: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLDivElement>(null);
  const { playSound } = useSound();

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      await messageDal.post(username, text, roomId);
      setInput("");
    },
    onSuccess: () => {
      playSound(SoundType.Send);
    },
    onError: (error) => {
      playSound(SoundType.Error);
      setError(error.message);
    },
  });

  useEffect(() => {
    if (error === null) return;
    const timeout = setTimeout(() => {
      setError(null);
    }, 3000);
    return () => clearTimeout(timeout);
  }, [error]);

  return (
    <div className="flex gap-4 relative">
      {error && (
        <div className="absolute -top-18 left-1/2 -translate-x-1/2 bg-zinc-900/50 border border-zinc-800 rounded-md p-2 text-zinc-400 text-xs">
          <p className="font-bold text-red-500">{error}</p>
        </div>
      )}
      <div className="flex-1 relative group">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500 animate-pulse">
          {">"}
        </span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) {
              // TODO: send message
              sendMessage({ text: input });
              inputRef.current?.focus();
            }
          }}
          placeholder="Escribir mensaje..."
          autoFocus
          type="text"
          className={`w-full bg-black border border-zinc-800 focus:border-zinc-700 focus:outline-none transition-colors text-zinc-100 placeholder:text-zinc-700 py-3 pl-8 pr-4 text-sm ${
            isPending ? "text-zinc-400" : ""
          }`}
        />
      </div>
      <button
        onClick={() => {
          sendMessage({ text: input });
          inputRef.current?.focus();
        }}
        disabled={!input.trim() || isPending}
        className="bg-zinc-800 text-zinc-400 px-4 text-sm font-bold hover:text-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
      >
        {isPending ? (
          <>
            <span>
              <Loader2Icon className="size-4 animate-spin" />
            </span>
            ENVIANDO...
          </>
        ) : (
          <>
            <span>
              <SendIcon className="size-4" />
            </span>
            ENVIAR
          </>
        )}
      </button>
    </div>
  );
}
