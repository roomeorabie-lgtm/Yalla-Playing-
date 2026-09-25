import React from 'react';
import { ARABIC_LETTERS, RoomState } from '../types/game.ts';
import { Sparkles, Hourglass } from 'lucide-react';

interface ChoosingLetterScreenProps {
  roomState: RoomState;
  playerId: string | null;
  onSelectLetter: (letter: string) => void;
}

export const ChoosingLetterScreen: React.FC<ChoosingLetterScreenProps> = ({
  roomState,
  playerId,
  onSelectLetter,
}) => {
  const isMyTurn = roomState.letterPickerId === playerId;
  const pickerPlayer = roomState.players.find((p) => p.id === roomState.letterPickerId);
  const pickerName = pickerPlayer ? pickerPlayer.name : 'اللاعب';

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 flex flex-col items-center text-center">
      {/* Round & Turn Header */}
      <div className="mb-4">
        <span className="inline-block bg-rose-100 text-rose-800 text-xs font-bold px-3 py-1 rounded-full mb-2">
          الجولة رقم {roomState.currentRound}
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold font-['Cairo'] text-rose-950">
          اختيار حرف الجولة
        </h2>
      </div>

      {/* Turn Banner */}
      <div
        className={`w-full max-w-md p-4 rounded-2xl border mb-6 transition-all ${
          isMyTurn
            ? 'bg-gradient-to-r from-amber-50 to-rose-50 border-amber-300 shadow-md ring-2 ring-amber-200'
            : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        {isMyTurn ? (
          <div className="flex items-center justify-center gap-2 text-amber-950 font-bold text-sm md:text-base">
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
            <span>دورك الآن! اختر حرفًا من اللوحة لبدء الجولة 🎯</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-slate-700 text-sm font-medium">
            <Hourglass className="w-4 h-4 text-rose-500 animate-spin shrink-0" />
            <span>
              في انتظار <strong className="font-bold text-rose-900">{pickerName}</strong> لاختيار حرف الجولة...
            </span>
          </div>
        )}
      </div>

      {/* Alphabet Grid */}
      <div className="w-full bg-white border border-rose-100 rounded-3xl p-5 md:p-6 shadow-sm">
        <p className="text-xs text-slate-400 mb-4 text-right">
          {isMyTurn
            ? 'اضغط على أي حرف ترغب به لبدء الجولة فوراً:'
            : 'لوحة الحروف الأبجدية العربية:'}
        </p>

        <div className="grid grid-cols-7 sm:grid-cols-7 md:grid-cols-9 gap-2 md:gap-2.5">
          {ARABIC_LETTERS.map((letter) => {
            const isUsed = roomState.usedLetters.includes(letter);

            return (
              <button
                key={letter}
                type="button"
                disabled={!isMyTurn}
                onClick={() => {
                  if (isMyTurn) {
                    onSelectLetter(letter);
                  }
                }}
                className={`h-12 md:h-14 text-xl md:text-2xl font-bold font-['Cairo'] rounded-xl transition-all flex items-center justify-center relative select-none ${
                  isMyTurn
                    ? 'cursor-pointer bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-950 border border-rose-200 hover:border-rose-500 shadow-xs hover:scale-105 active:scale-95'
                    : 'bg-slate-50 text-slate-700 border border-slate-200/80 cursor-default opacity-85'
                } ${
                  isUsed
                    ? 'ring-1 ring-amber-300 bg-amber-50/50'
                    : ''
                }`}
                title={isUsed ? `تم استخدام حرف (${letter}) مسبقاً` : `حرف (${letter})`}
              >
                {letter}
                {isUsed && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {roomState.usedLetters.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <span>الحروف التي تم لعبها سابقاً مميزة بنقطة ذهبية:</span>
            <span className="font-bold text-slate-600">
              {roomState.usedLetters.join(' · ')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
