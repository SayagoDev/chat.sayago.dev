import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

interface ShowErrosProps {
  customError?: {
    title: string;
    message: string;
  } | null;
}

export function ShowErrors({ customError }: ShowErrosProps) {
  {
    const searchParams = useSearchParams();
    const wasDestroyed = searchParams.get("destroyed") === "true";
    const error = searchParams.get("error");

    useEffect(() => {
      const url = new URL(window.location.href);
      const params = url.searchParams;

      const timeout = setTimeout(() => {
        if (wasDestroyed) {
          params.delete("destroyed");
        }
        if (error) {
          params.delete("error");
        }
        window.history.replaceState(null, "", url);
      }, 5000);

      return () => clearTimeout(timeout);
    }, [wasDestroyed, error]);

    return (
      <>
        {customError && (
          <div className="bg-red-950/50 border border-red-900 p-4 text-center">
            <p className="text-red-500 text-sm font-bold">
              {customError.title}
            </p>
            <p className="text-zinc-500 text-xs mt-1">{customError.message}</p>
          </div>
        )}
        {wasDestroyed && (
          <div className="bg-red-950/50 border border-red-900 p-4 text-center">
            <p className="text-red-500 text-sm font-bold">SALA DESTRUIDA</p>
            <p className="text-zinc-500 text-xs mt-1">
              Todos los mensajes han sido eliminados.
            </p>
          </div>
        )}
        {error === "room-not-found" && (
          <div className="bg-red-950/50 border border-red-900 p-4 text-center">
            <p className="text-red-500 text-sm font-bold">SALA NO ENCONTRADA</p>
            <p className="text-zinc-500 text-xs mt-1">
              La sala que estás buscando no existe. O ha sido destruida.
            </p>
          </div>
        )}
        {error === "room-is-full" && (
          <div className="bg-red-950/50 border border-red-900 p-4 text-center">
            <p className="text-red-500 text-sm font-bold">SALA LLENA</p>
            <p className="text-zinc-500 text-xs mt-1">
              La sala que estás buscando está llena.
            </p>
          </div>
        )}
        {error === "invalid-invite" && (
          <div className="bg-red-950/50 border border-red-900 p-4 text-center">
            <p className="text-red-500 text-sm font-bold">
              INVITACIÓN INVÁLIDA
            </p>
            <p className="text-zinc-500 text-xs mt-1">
              El código de invitación es inválido o ha expirado.
            </p>
          </div>
        )}
      </>
    );
  }
}
