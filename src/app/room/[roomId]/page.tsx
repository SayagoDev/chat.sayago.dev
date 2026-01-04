"use client";

import { useUsername } from "@/hooks/useUsername";
import { client } from "@/lib/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CheckIcon,
  LinkIcon,
  Loader2Icon,
  SendIcon,
  TrashIcon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { useRealtime } from "@/lib/realtime-client";
import { useSound } from "@/hooks/useSound";

function formatTimeRemaining(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function RoomPage() {
  const [copyStatus, setCopyStatus] = useState<
    "invitar" | "generando" | "copiado" | "error"
  >("invitar");
  const { username } = useUsername();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { playSound } = useSound();
  const router = useRouter();

  const params = useParams();
  const roomId = params.roomId as string;

  const { data: ttlData } = useQuery({
    queryKey: ["ttl", roomId],
    queryFn: async () => {
      const res = await client.room.ttl.get({ query: { roomId } });
      return res.data;
    },
  });

  useEffect(() => {
    if (ttlData?.ttl !== undefined) {
      setTimeRemaining(ttlData.ttl);
    }
  }, [ttlData]);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining < 0) return;

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
  }, [timeRemaining, router]);

  const { data: messages, refetch } = useQuery({
    queryKey: ["messages", roomId],
    queryFn: async () => {
      const res = await client.messages.get({ query: { roomId } });
      return res.data;
    },
  });

  // Auto-scroll al final cuando lleguen nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useRealtime({
    channels: [roomId],
    events: ["chat.message", "chat.destroy"],
    onData: ({ event, data }) => {
      if (event === "chat.message") {
        refetch();
        // Reproducir sonido solo si el mensaje no es del usuario actual
        if (data?.sender !== username) {
          playSound("receive");
        }
      }

      if (event === "chat.destroy") {
        playSound("destroy");
        setTimeout(() => {
          router.push("/?destroyed=true");
        }, 700);
      }
    },
  });

  const copyLInk = async () => {
    setCopyStatus("generando");

    try {
      const res = await client.room.invite.post(null, { query: { roomId } });

      if (res.status === 200 && res.data?.code) {
        const url = window.location.origin + "/join/" + res.data.code;
        await navigator.clipboard.writeText(url);
        playSound("copy");
        setCopyStatus("copiado");
        setTimeout(() => {
          setCopyStatus("invitar");
        }, 3000);
      } else {
        throw new Error("Failed to generate invite");
      }
    } catch {
      playSound("error");
      setCopyStatus("error");
      setTimeout(() => {
        setCopyStatus("invitar");
      }, 2000);
    }
  };

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      await client.messages.post(
        {
          sender: username,
          text,
        },
        { query: { roomId } }
      );
      setInput("");
    },
    onSuccess: () => {
      playSound("send");
    },
    onError: () => {
      playSound("error");
    },
  });

  const { mutate: destroyRoom } = useMutation({
    mutationFn: async () => {
      await client.room.delete(null, { query: { roomId } });
    },
  });

  return (
    <main className="flex flex-col h-dvh max-h-dvh overflow-hidden">
      <header className="border-b border-zinc-800 p-4 flex items-center justify-between bg-zinc-900/30">
        <div className="flex items-center gap-4">
          <button
            className="flex items-center gap-2 text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={copyLInk}
            disabled={copyStatus === "generando"}
          >
            {copyStatus === "copiado" && (
              <CheckIcon className="size-4 text-green-500" />
            )}
            {copyStatus === "generando" && (
              <Loader2Icon className="size-4 animate-spin" />
            )}
            {copyStatus === "invitar" && <LinkIcon className="size-4" />}
            {copyStatus === "error" && <span className="text-red-500">!</span>}
            <span className="uppercase font-bold">{copyStatus}</span>
          </button>

          <div className="h-8 w-px bg-zinc-800" />

          <div className="flex flex-col">
            <span className="text-xs text-zinc-500 uppercase">
              Autodestrucción
            </span>
            <span
              className={`text-sm font-bold flex items-center gap-2 ${
                timeRemaining !== null && timeRemaining > 300
                  ? "text-green-500"
                  : ""
              } ${
                timeRemaining !== null && timeRemaining < 60
                  ? "text-red-500"
                  : "text-amber-500"
              } ${
                timeRemaining !== null && timeRemaining < 10
                  ? "animate-pulse"
                  : ""
              }`}
            >
              {timeRemaining !== null
                ? formatTimeRemaining(timeRemaining)
                : "--:--"}
            </span>
          </div>
        </div>
        <button
          onClick={() => destroyRoom()}
          className="text-xs bg-zinc-800 hover:bg-red-600 px-2 sm:px-3 py-1.5 rounded text-zinc-400 hover:text-white font-bold  transition-all group flex items-center gap-2 disabled:opacity-50"
        >
          <span className="group-hover:animate-pulse">
            <TrashIcon className="size-4 -translate-y-px" />
          </span>
          <span className="hidden sm:inline">DESTRUIR AHORA</span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages?.messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-600 text-sm font-mono">
              No hay mensajes en esta sala, empieza la conversación.
            </p>
          </div>
        )}

        {messages?.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col items-end ${
              msg.sender === username ? "items-end" : "items-start"
            }`}
          >
            <div className="max-w-[80%] group">
              <div
                className={`flex items-baseline gap-3 mb-1 ${
                  msg.sender === username ? "justify-end" : "justify-start"
                }`}
              >
                <span
                  className={`text-sm font-bold ${
                    msg.sender === username
                      ? "text-green-500 order-1"
                      : "text-blue-500"
                  }`}
                >
                  {msg.sender === username ? "Tú" : msg.sender}
                </span>
                <span className="text-[10px] text-zinc-600">
                  {format(msg.timestamp, "HH:mm")}
                </span>
              </div>

              <p className="text-sm text-zinc-300 leading-relaxed break-all">
                {msg.text}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
        <div className="flex gap-4">
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
      </div>
    </main>
  );
}
