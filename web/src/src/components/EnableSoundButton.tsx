"use client";

import { useSoundPermission } from "@/hooks/useSoundPermission";

export default function EnableSoundButton() {
  const { enabled, activateSound } = useSoundPermission();

  if (enabled) return null; // hilang otomatis

  return (
    <button
      onClick={activateSound}
      className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition"
    >
      🔊 Enable Notification Sound
    </button>
  );
}
