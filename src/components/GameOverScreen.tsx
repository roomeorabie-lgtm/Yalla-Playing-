import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { RoomState } from '../types/game.ts';
import { sounds } from '../utils/sound.ts';
import { RotateCcw, Home, Sparkles } from 'lucide-react';

interface GameOverScreenProps {
  roomState: RoomState;
  isHost: boolean;
  onRestartGame: () => void;
  onLeaveRoom: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  roomState,
  isHost,
  onRestartGame,
  onLeaveRoom,
}) => {
  useEffect(() => {
    sounds.playVictoryFanfare();

    // Trigger celebration confetti
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#f43f5e', '#ec4899', '#f59e0b', '#10b981', '#6366f1']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#f43f5e', '#ec4899', '#f59e0b', '#10b981', '#6366f1']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  // Sort players by score descending
  const sortedPlayers = [...roomState.players].sort((a, b) => b.totalScore - a.totalScore);
  const first = sortedPlayers[0];
  const second = sortedPlayers[1];
  const third = sortedPlayers[2];
  const rest = sortedPlayers.slice(3);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 flex flex-col items-center text-center">
      {/* Celebration Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 text-xs font-black px-4 py-1.5 rounded-full mb-3 shadow-xs">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>وصلنا إلى الهدف: {roomState.targetScore} نقطة!</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black font-['Cairo'] text-rose-950 mb-1">
          نهاية اللعبة والترتيب النهائي
        </h1>
        <p className="text-slate-600 text-sm">
          مبارك للفائز وحظ أوفر لجميع اللاعبين الرائعين! 🎉
        </p>
      </div>

      {/* Podium Display */}
      <div className="w-full grid grid-cols-3 gap-2.5 md:gap-4 items-end mb-8 pt-4">
        {/* 2nd Place */}
        {second ? (
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-3 md:p-4 text-center shadow-md flex flex-col items-center">
            <span className="text-3xl mb-1 select-none">🥈</span>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl mb-2">
              {second.avatar}
            </div>
            <span className="text-xs font-bold text-slate-500 mb-0.5">المركز الثاني</span>
            <h3 className="font-extrabold text-sm md:text-base text-slate-900 truncate w-full" title={second.name}>
              {second.name}
            </h3>
            <span className="font-mono font-black text-rose-600 text-sm mt-1">
              {second.totalScore} نقطة
            </span>
          </div>
        ) : (
          <div />
        )}

        {/* 1st Place */}
        {first && (
          <div className="bg-gradient-to-b from-amber-50 to-rose-50 border-2 border-amber-400 rounded-3xl p-4 md:p-5 text-center shadow-xl flex flex-col items-center relative -translate-y-3 ring-4 ring-amber-200/50">
            <div className="absolute -top-4 bg-amber-400 text-amber-950 text-[10px] font-black px-3 py-0.5 rounded-full border border-white shadow-sm flex items-center gap-1">
              👑 البطلة
            </div>
            <span className="text-4xl mb-1 select-none">🥇</span>
            <div className="w-16 h-16 rounded-2xl bg-white border-2 border-amber-300 shadow-md flex items-center justify-center text-3xl mb-2">
              {first.avatar}
            </div>
            <span className="text-xs font-black text-amber-800 mb-0.5">المركز الأول</span>
            <h3 className="font-extrabold text-base md:text-lg text-rose-950 truncate w-full" title={first.name}>
              {first.name}
            </h3>
            <span className="font-mono font-black text-rose-600 text-base md:text-lg mt-1">
              {first.totalScore} نقطة
            </span>
          </div>
        )}

        {/* 3rd Place */}
        {third ? (
          <div className="bg-white border-2 border-amber-200/80 rounded-3xl p-3 md:p-4 text-center shadow-md flex flex-col items-center">
            <span className="text-3xl mb-1 select-none">🥉</span>
            <div className="w-12 h-12 rounded-2xl bg-amber-50/60 flex items-center justify-center text-2xl mb-2">
              {third.avatar}
            </div>
            <span className="text-xs font-bold text-amber-700 mb-0.5">المركز الثالث</span>
            <h3 className="font-extrabold text-sm md:text-base text-slate-900 truncate w-full" title={third.name}>
              {third.name}
            </h3>
            <span className="font-mono font-black text-rose-600 text-sm mt-1">
              {third.totalScore} نقطة
            </span>
          </div>
        ) : (
          <div />
        )}
      </div>

      {/* Remaining Players List */}
      {rest.length > 0 && (
        <div className="w-full bg-white border border-slate-200 rounded-3xl p-4 shadow-xs mb-8 text-right">
          <h4 className="text-xs font-bold text-slate-500 mb-3 px-2">باقي المراكز:</h4>
          <div className="space-y-2">
            {rest.map((p, idx) => (
              <div
                key={p.id}
                className="p-2.5 rounded-xl bg-slate-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold text-xs w-4">
                    {idx + 4}
                  </span>
                  <span className="text-lg">{p.avatar}</span>
                  <span className="text-sm font-bold text-slate-800">{p.name}</span>
                </div>
                <span className="font-mono font-bold text-rose-700 text-xs">
                  {p.totalScore} نقطة
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* End Controls */}
      <div className="w-full max-w-md space-y-3">
        {isHost ? (
          <button
            onClick={onRestartGame}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-emerald-200/50 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <RotateCcw className="w-5 h-5" />
            <span>لعب مباراة جديدة مع نفس الغرفة</span>
          </button>
        ) : (
          <p className="text-xs text-slate-500 mb-2">
            تستطيع مالكة الغرفة 👑 إعادة بدء مباراة جديدة للجميع
          </p>
        )}

        <button
          onClick={onLeaveRoom}
          className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <Home className="w-4 h-4 text-slate-500" />
          <span>العودة للصفحة الرئيسية</span>
        </button>
      </div>
    </div>
  );
};
