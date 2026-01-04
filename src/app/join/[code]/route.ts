import { redis } from "@/lib/redis";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
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
    return NextResponse.redirect(new URL("/?error=invalid-invite", req.url));
  }

  // Verificar que la sala existe
  const meta = await redis.hgetall<{
    connected: string[];
    createdAt: number;
  }>(`meta:${invite.roomId}`);

  if (!meta) {
    await redis.del(`invite:${upperCode}`);
    await redis.srem(`invites:${invite.roomId}`, upperCode);
    return NextResponse.redirect(new URL("/?error=room-not-found", req.url));
  }

  const connected = Array.isArray(meta.connected) ? meta.connected : [];

  // Verificar que la sala no está llena
  if (connected.length >= 2) {
    return NextResponse.redirect(new URL("/?error=room-is-full", req.url));
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

  // Crear response con redirección
  const response = NextResponse.redirect(
    new URL(`/room/${invite.roomId}`, req.url)
  );

  // Establecer cookie httpOnly
  // Usar "lax" para permitir que la cookie se establezca en navegaciones cross-site
  response.cookies.set("x-auth-token", token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return response;
}
