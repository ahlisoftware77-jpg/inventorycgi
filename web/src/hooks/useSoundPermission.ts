"use client";

import { useEffect, useState } from "react";

export function useSoundPermission() {
  const [enabled, setEnabled] = useState(false);
  const STORAGE_KEY = "sound_enabled";

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "true") {
      setEnabled(true);

      // Pre-warm audio (tanpa bunyi)
      const audio = document.getElementById("notification-sound") as HTMLAudioElement | null;
      if (audio) audio.load();
    }
  }, []);

  const activateSound = async () => {
    const audio = document.getElementById("notification-sound") as HTMLAudioElement | null;
    if (!audio) return;

    try {
      await audio.play(); // coba mainkan
      audio.pause();      // langsung pause, hanya untuk memberi izin autoplay
      audio.currentTime = 0;

      localStorage.setItem(STORAGE_KEY, "true");
      setEnabled(true);
    } catch (err) {
      console.warn("Failed to activate sound", err);
    }
  };

  return { enabled, activateSound };
}
