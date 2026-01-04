import { redis } from "@/lib/redis";
import { redirect } from "next/navigation";
import { JoinButton } from "./join-button";

interface Props {
  params: Promise<{ code: string }>;
}

export default async function JoinPage({ params }: Props) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  // Verificar que la invitación existe
  const invite = await redis.get<{ roomId: string; createdBy: string }>(
    `invite:${upperCode}`
  );

  if (!invite) {
    redirect("/?error=invalid-invite");
  }

  // Verificar que la sala existe
  const meta = await redis.hgetall<{
    connected: string[];
    createdAt: number;
  }>(`meta:${invite.roomId}`);

  if (!meta) {
    redirect("/?error=room-not-found");
  }

  const connected = Array.isArray(meta.connected) ? meta.connected : [];

  if (connected.length >= 2) {
    redirect("/?error=room-is-full");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-green-500">
            {">"}chat_privado
          </h1>
          <p className="text-zinc-500 text-sm">
            Te han invitado a una sala privada
          </p>
        </div>

        <div className="border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-md space-y-6">
          <div className="text-center">
            <span className="text-xs text-zinc-500 uppercase">
              Código de invitación
            </span>
            <p className="text-2xl font-bold text-green-500 font-mono mt-1">
              {upperCode}
            </p>
          </div>

          <div className="text-center text-zinc-500 text-xs">
            <p>Esta invitación es de un solo uso.</p>
            <p>La sala se autodestruirá en minutos.</p>
          </div>

          <JoinButton code={upperCode} />
        </div>
      </div>
    </main>
  );
}
