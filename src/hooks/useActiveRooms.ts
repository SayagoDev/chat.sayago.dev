import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "active-rooms";

export interface ActiveRoom {
  roomId: string;
  token: string;
  joinedAt: number;
}

export function useActiveRooms() {
  const [rooms, setRooms] = useState<ActiveRoom[]>([]);

  // Cargar salas del localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ActiveRoom[];
        // Filtrar salas de más de 10 minutos (ya expiraron)
        const validRooms = parsed.filter(
          (room) => Date.now() - room.joinedAt < 10 * 60 * 1000
        );
        setRooms(validRooms);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(validRooms));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Agregar una sala con token
  const addRoom = useCallback((roomId: string, token: string) => {
    setRooms((prev) => {
      // Si ya existe, actualizar el token
      const existing = prev.find((r) => r.roomId === roomId);
      if (existing) {
        const newRooms = prev.map((r) =>
          r.roomId === roomId ? { ...r, token } : r
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newRooms));
        return newRooms;
      }
      const newRooms = [...prev, { roomId, token, joinedAt: Date.now() }];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newRooms));
      return newRooms;
    });
  }, []);

  // Eliminar una sala
  const removeRoom = useCallback((roomId: string) => {
    setRooms((prev) => {
      const newRooms = prev.filter((r) => r.roomId !== roomId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newRooms));
      return newRooms;
    });
  }, []);

  // Obtener token de una sala
  const getToken = useCallback((roomId: string): string | null => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored) as ActiveRoom[];
      const room = parsed.find((r) => r.roomId === roomId);
      return room?.token ?? null;
    } catch {
      return null;
    }
  }, []);

  // Limpiar todas las salas
  const clearRooms = useCallback(() => {
    setRooms([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { rooms, addRoom, removeRoom, getToken, clearRooms };
}
