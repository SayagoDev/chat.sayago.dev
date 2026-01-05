import { JoinButton } from "./_components/JoinButton";
import { joinDal } from "@/data/join.dal";
import { roomDal } from "@/data/room.dal";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ code: string }>;
}

export default async function JoinPage({ params }: Props) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  const invite = await joinDal.getInvitation(upperCode);

  const meta = await roomDal.getAllRooms(invite);

  if (meta.connected.length >= 2) {
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
