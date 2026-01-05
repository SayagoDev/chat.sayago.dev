import { Message } from "@/lib/realtime";
import { format } from "date-fns";
import { useEffect, useRef } from "react";

export function ShowMessages({
  messages,
  username,
}: {
  messages?: Message[];
  username: string;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final cuando lleguen nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
      {messages?.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <p className="text-zinc-600 text-sm font-mono">
            No hay mensajes en esta sala, empieza la conversación.
          </p>
        </div>
      )}

      {messages?.map((msg) => (
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
  );
}
