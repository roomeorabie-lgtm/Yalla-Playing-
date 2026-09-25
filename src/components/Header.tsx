import React from 'react';
import { Volume2, VolumeX, LogOut, Users } from 'lucide-react';
import { sounds } from '../utils/sound.ts';
import { RoomState } from '../types/game.ts';

interface HeaderProps {
  roomState: RoomState | null;
  onLeaveRoom: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  roomState,
  onLeaveRoom,
  soundEnabled,
  onToggleSound,
}) => {
  return (
    <header className="w-full bg-white/80 backdrop-blur-md border-b border-rose-100 sticky top-0 z-40 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Brand Zone */}
        <div className="flex items-center gap-2.5">
          <span className="text-2xl" role="img" aria-label="party">🎉</span>
          <span className="text-xl font-black font-['Cairo'] tracking-tight text-rose-950">
            Yalla Playing
          </span>
        </div>

        {/* Center: Room Code indicator if in game */}
        {roomState && (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200/60 px-3 py-1 rounded-full text-xs font-medium text-rose-900 shadow-xs">
            <Users className="w-3.5 h-3.5 text-rose-500" />
            <span>غرفة: <strong className="font-bold tracking-wider">{roomState.code}</strong></span>
            <span className="text-rose-300">·</span>
            <span>الهدف: <strong>{roomState.targetScore}</strong> نقطة</span>
          </div>
        )}

        {/* Actions Zone */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sounds.enabled = !soundEnabled;
              onToggleSound();
            }}
            title={soundEnabled ? 'كتم الصوت' : 'تشغيل الصوت'}
            className="p-2 text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            aria-label="تبديل الصوت"
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5 text-rose-600" />
            ) : (
              <VolumeX className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {roomState && (
            <button
              onClick={() => {
                if (window.confirm('هل أنتِ متأكدة من مغادرة الغرفة؟')) {
                  onLeaveRoom();
                }
              }}
              title="مغادرة الغرفة"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 hover:text-rose-900 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>مغادرة</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
