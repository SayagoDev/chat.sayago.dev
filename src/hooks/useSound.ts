"use client";

import { useCallback, useRef } from "react";

type SoundType =
  | "send"
  | "receive"
  | "copy"
  | "error"
  | "success"
  | "click"
  | "destroy";

export const useSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const playSound = useCallback(
    (type: SoundType) => {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Configurar el sonido según el tipo
      switch (type) {
        case "send":
          // Sonido de envío: brillante estilo WhatsApp
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.connect(gain1);
          gain1.connect(ctx.destination);
          osc1.type = "sine";
          osc1.frequency.setValueAtTime(1200, now);
          osc1.frequency.exponentialRampToValueAtTime(1600, now + 0.05);
          gain1.gain.setValueAtTime(0.2, now);
          gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc1.start(now);
          osc1.stop(now + 0.1);
          return;

        case "receive":
          // Sonido de recepción: doble tono brillante
          const playReceiveTone = (
            freq: number,
            delay: number,
            duration: number
          ) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now + delay);
            gain.gain.setValueAtTime(0.15, now + delay);
            gain.gain.exponentialRampToValueAtTime(
              0.01,
              now + delay + duration
            );
            osc.start(now + delay);
            osc.stop(now + delay + duration);
          };
          playReceiveTone(900, 0, 0.08);
          playReceiveTone(1100, 0.05, 0.08);
          return;

        case "copy":
          // Sonido de copiado: ping brillante
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(1400, now);
          oscillator.frequency.exponentialRampToValueAtTime(1800, now + 0.08);
          gainNode.gain.setValueAtTime(0.2, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
          oscillator.start(now);
          oscillator.stop(now + 0.12);
          break;

        case "error":
          // Sonido de error: tono bajo
          oscillator.type = "sawtooth";
          oscillator.frequency.setValueAtTime(200, now);
          oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.2);
          gainNode.gain.setValueAtTime(0.3, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          oscillator.start(now);
          oscillator.stop(now + 0.2);
          break;

        case "success":
          // Sonido de éxito: acorde ascendente
          const playTone = (freq: number, delay: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(freq, now + delay);
            gain.gain.setValueAtTime(0.15, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.15);
            osc.start(now + delay);
            osc.stop(now + delay + 0.15);
          };
          playTone(523, 0); // C
          playTone(659, 0.05); // E
          playTone(784, 0.1); // G
          return; // Ya manejamos todo aquí

        case "click":
          // Sonido de click: tono muy corto
          oscillator.frequency.setValueAtTime(1000, now);
          gainNode.gain.setValueAtTime(0.1, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
          oscillator.start(now);
          oscillator.stop(now + 0.05);
          break;

        case "destroy":
          // Sonido de destrucción: explosión dramática
          // Componente de explosión principal
          const explosion = ctx.createOscillator();
          const explosionGain = ctx.createGain();
          explosion.type = "sawtooth";
          explosion.connect(explosionGain);
          explosionGain.connect(ctx.destination);
          explosion.frequency.setValueAtTime(400, now);
          explosion.frequency.exponentialRampToValueAtTime(50, now + 0.5);
          explosionGain.gain.setValueAtTime(0.4, now);
          explosionGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
          explosion.start(now);
          explosion.stop(now + 0.5);

          // Ruido de alta frecuencia (crash)
          const crash = ctx.createOscillator();
          const crashGain = ctx.createGain();
          crash.type = "square";
          crash.connect(crashGain);
          crashGain.connect(ctx.destination);
          crash.frequency.setValueAtTime(2000, now);
          crash.frequency.exponentialRampToValueAtTime(100, now + 0.3);
          crashGain.gain.setValueAtTime(0.25, now);
          crashGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          crash.start(now);
          crash.stop(now + 0.3);

          // Resonancia final
          const rumble = ctx.createOscillator();
          const rumbleGain = ctx.createGain();
          rumble.type = "sine";
          rumble.connect(rumbleGain);
          rumbleGain.connect(ctx.destination);
          rumble.frequency.setValueAtTime(80, now + 0.15);
          rumble.frequency.exponentialRampToValueAtTime(30, now + 0.7);
          rumbleGain.gain.setValueAtTime(0.2, now + 0.15);
          rumbleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
          rumble.start(now + 0.15);
          rumble.stop(now + 0.7);
          return;

        default:
          oscillator.frequency.setValueAtTime(440, now);
          gainNode.gain.setValueAtTime(0.2, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          oscillator.start(now);
          oscillator.stop(now + 0.1);
      }
    },
    [getAudioContext]
  );

  return { playSound };
};
