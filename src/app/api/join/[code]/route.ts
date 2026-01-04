import { redis } from "@/lib/redis";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  // Obtener la invitación
  const invite = await redis.get<{ roomId: string; createdBy: string }>(
    `invite:${upperCode}`
  );

  if (!invite) {
    return NextResponse.json(
      { error: "Invitación inválida o expirada" },
      { status: 400 }
    );
  }

  // Verificar que la sala existe
  const meta = await redis.hgetall<{
    connected: string[];
    createdAt: number;
  }>(`meta:${invite.roomId}`);

  if (!meta) {
    await redis.del(`invite:${upperCode}`);
    await redis.srem(`invites:${invite.roomId}`, upperCode);
    return NextResponse.json(
      { error: "La sala ya no existe" },
      { status: 400 }
    );
  }

  const connected = Array.isArray(meta.connected) ? meta.connected : [];

  // Verificar que la sala no está llena
  if (connected.length >= 2) {
    return NextResponse.json({ error: "La sala está llena" }, { status: 400 });
  }

  // Eliminar invitación (un solo uso)
  await redis.del(`invite:${upperCode}`);
  await redis.srem(`invites:${invite.roomId}`, upperCode);

  // Crear token para el nuevo usuario
  const token = nanoid();

  // Agregar token a connected
  await redis.hset(`meta:${invite.roomId}`, {
    connected: [...connected, token],
  });

  // Crear response con cookie y token
  const response = NextResponse.json({ roomId: invite.roomId, token });

  response.cookies.set("x-auth-token", token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 10,
  });

  return response;
}
