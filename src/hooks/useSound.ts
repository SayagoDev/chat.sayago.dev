"use client";

import { useCallback, useRef } from "react";

export enum SoundType {
  Send = "send",
  Receive = "receive",
  Copy = "copy",
  Error = "error",
  Success = "success",
  Click = "click",
  Destroy = "destroy",
}

export const useSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPlayTimeRef = useRef<Record<string, number>>({});
  const activeOscillatorsRef = useRef<number>(0);

  const getAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }, []);

  const playSound = useCallback(
    async (type: SoundType, forcePlay = false) => {
      try {
        const ctx = await getAudioContext();
        const now = Date.now();

        // THROTTLE: Evitar reproducir el mismo sonido muy seguido (excepto si forcePlay)
        const lastPlayTime = lastPlayTimeRef.current[type] || 0;
        const minInterval = 50; // mínimo 50ms entre sonidos del mismo tipo

        if (!forcePlay && now - lastPlayTime < minInterval) {
          return; // Ignorar el sonido si es demasiado rápido
        }

        // LÍMITE: No más de 10 osciladores simultáneos
        const maxOscillators = 10;
        if (activeOscillatorsRef.current >= maxOscillators) {
          console.warn("Demasiados sonidos simultáneos, ignorando...");
          return;
        }

        lastPlayTimeRef.current[type] = now;
        const startTime = ctx.currentTime + 0.01;

        // Función helper para trackear osciladores
        const createTrackedOscillator = () => {
          activeOscillatorsRef.current++;
          const osc = ctx.createOscillator();

          // Decrementar contador cuando termine
          osc.onended = () => {
            activeOscillatorsRef.current = Math.max(
              0,
              activeOscillatorsRef.current - 1
            );
          };

          return osc;
        };

        switch (type) {
          case SoundType.Send: {
            const osc1 = createTrackedOscillator();
            const gain1 = ctx.createGain();
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.type = "sine";
            osc1.frequency.setValueAtTime(1200, startTime);
            osc1.frequency.exponentialRampToValueAtTime(1600, startTime + 0.05);
            gain1.gain.setValueAtTime(0.2, startTime);
            gain1.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
            osc1.start(startTime);
            osc1.stop(startTime + 0.1);
            return;
          }
          case SoundType.Receive: {
            const playReceiveTone = (
              freq: number,
              delay: number,
              duration: number
            ) => {
              const osc = createTrackedOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.type = "sine";
              osc.frequency.setValueAtTime(freq, startTime + delay);
              gain.gain.setValueAtTime(0.15, startTime + delay);
              gain.gain.exponentialRampToValueAtTime(
                0.01,
                startTime + delay + duration
              );
              osc.start(startTime + delay);
              osc.stop(startTime + delay + duration);
            };
            playReceiveTone(900, 0, 0.08);
            playReceiveTone(1100, 0.05, 0.08);
            return;
          }
          case SoundType.Copy: {
            const oscillator = createTrackedOscillator();
            const gainNode = ctx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(1400, startTime);
            oscillator.frequency.exponentialRampToValueAtTime(
              1800,
              startTime + 0.08
            );
            gainNode.gain.setValueAtTime(0.2, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.12);
            oscillator.start(startTime);
            oscillator.stop(startTime + 0.12);
            return;
          }
          case SoundType.Error: {
            const oscillator = createTrackedOscillator();
            const gainNode = ctx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.type = "sawtooth";
            oscillator.frequency.setValueAtTime(200, startTime);
            oscillator.frequency.exponentialRampToValueAtTime(
              100,
              startTime + 0.2
            );
            gainNode.gain.setValueAtTime(0.3, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
            oscillator.start(startTime);
            oscillator.stop(startTime + 0.2);
            return;
          }
          case SoundType.Success: {
            const playTone = (freq: number, delay: number) => {
              const osc = createTrackedOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.setValueAtTime(freq, startTime + delay);
              gain.gain.setValueAtTime(0.15, startTime + delay);
              gain.gain.exponentialRampToValueAtTime(
                0.01,
                startTime + delay + 0.15
              );
              osc.start(startTime + delay);
              osc.stop(startTime + delay + 0.15);
            };
            playTone(523, 0); // C
            playTone(659, 0.05); // E
            playTone(784, 0.1); // G
            return;
          }
          case SoundType.Click: {
            const oscillator = createTrackedOscillator();
            const gainNode = ctx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.frequency.setValueAtTime(1000, startTime);
            gainNode.gain.setValueAtTime(0.1, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.05);
            oscillator.start(startTime);
            oscillator.stop(startTime + 0.05);
            return;
          }
          case SoundType.Destroy: {
            const explosion = createTrackedOscillator();
            const explosionGain = ctx.createGain();
            explosion.type = "sawtooth";
            explosion.connect(explosionGain);
            explosionGain.connect(ctx.destination);
            explosion.frequency.setValueAtTime(400, startTime);
            explosion.frequency.exponentialRampToValueAtTime(
              50,
              startTime + 0.5
            );
            explosionGain.gain.setValueAtTime(0.4, startTime);
            explosionGain.gain.exponentialRampToValueAtTime(
              0.01,
              startTime + 0.5
            );
            explosion.start(startTime);
            explosion.stop(startTime + 0.5);

            const crash = createTrackedOscillator();
            const crashGain = ctx.createGain();
            crash.type = "square";
            crash.connect(crashGain);
            crashGain.connect(ctx.destination);
            crash.frequency.setValueAtTime(2000, startTime);
            crash.frequency.exponentialRampToValueAtTime(100, startTime + 0.3);
            crashGain.gain.setValueAtTime(0.25, startTime);
            crashGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
            crash.start(startTime);
            crash.stop(startTime + 0.3);

            const rumble = createTrackedOscillator();
            const rumbleGain = ctx.createGain();
            rumble.type = "sine";
            rumble.connect(rumbleGain);
            rumbleGain.connect(ctx.destination);
            rumble.frequency.setValueAtTime(80, startTime + 0.15);
            rumble.frequency.exponentialRampToValueAtTime(30, startTime + 0.7);
            rumbleGain.gain.setValueAtTime(0.2, startTime + 0.15);
            rumbleGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.7);
            rumble.start(startTime + 0.15);
            rumble.stop(startTime + 0.7);
            return;
          }
          default: {
            const oscillator = createTrackedOscillator();
            const gainNode = ctx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.frequency.setValueAtTime(440, startTime);
            gainNode.gain.setValueAtTime(0.2, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
            oscillator.start(startTime);
            oscillator.stop(startTime + 0.1);
          }
        }
      } catch (error) {
        console.warn("Error al reproducir sonido:", error);
      }
    },
    [getAudioContext]
  );

  return { playSound, SoundType };
};
