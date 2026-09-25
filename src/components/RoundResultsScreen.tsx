import React from 'react';
import { CATEGORIES, CategoryKey, RoomState } from '../types/game.ts';
import { Sparkles, Trophy, ChevronRight, Check, AlertCircle } from 'lucide-react';

interface RoundResultsScreenProps {
  roomState: RoomState;
  playerId: string | null;
  isHost: boolean;
  onNextRound: () => void;
  onAdjustScore?: (targetPlayerId: string, category: CategoryKey, newPoints: number) => void;
}

export const RoundResultsScreen: React.FC<RoundResultsScreenProps> = ({
  roomState,
  playerId,
  isHost,
  onNextRound,
  onAdjustScore,
}) => {
  const currentLetter = roomState.currentLetter || '';
  const scores = roomState.roundScores;

  // Next picker player info
  const nextPickerIndex = (roomState.currentRound) % (roomState.players.length || 1);
  const nextPicker = roomState.players[nextPickerIndex];

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 flex flex-col items-center">
      {/* Header Banner */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-rose-100 text-rose-800 text-xs font-bold px-3 py-1 rounded-full mb-2">
          <span>نتائج الجولة {roomState.currentRound}</span>
          <span>·</span>
          <span>حرف: ({currentLetter})</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold font-['Cairo'] text-rose-950">
          جدول نقاط الجولة
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          فريدة (+10) · مكررة (+5) · خاطئة أو فارغة (0)
        </p>
      </div>

      {/* Players Results Cards */}
      <div className="w-full space-y-4 mb-8">
        {roomState.players.map((player) => {
          const pScore = scores[player.id];
          const isMe = player.id === playerId;

          return (
            <div
              key={player.id}
              className={`bg-white border rounded-3xl p-5 shadow-sm text-right transition-all ${
                isMe
                  ? 'border-rose-300 ring-2 ring-rose-200/60 bg-rose-50/15'
                  : 'border-slate-200'
              }`}
            >
              {/* Player Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-rose-100 text-rose-900 px-3 py-1 rounded-xl text-xs font-bold">
                    مجموع الجولة: <strong className="font-mono text-sm">{pScore?.roundTotal ?? 0}</strong> نقطة
                  </div>
                  <div className="bg-amber-100/70 text-amber-950 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-600" />
                    <span>المجموع الكلي: <strong className="font-mono">{player.totalScore}</strong> / {roomState.targetScore}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-base text-slate-900">
                        {player.name}
                      </span>
                      {player.isHost && <span title="مالك الغرفة">👑</span>}
                    </div>
                    {isMe && (
                      <span className="text-[10px] text-rose-600 font-semibold block">
                        (إجاباتك)
                      </span>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-xl shrink-0">
                    {player.avatar || '🌸'}
                  </div>
                </div>
              </div>

              {/* Answers Grid for this Player */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                {CATEGORIES.map((cat) => {
                  const res = pScore?.answers[cat.key];
                  const answerText = res?.answer || '—';
                  const points = res?.points ?? 0;
                  const status = res?.status;

                  return (
                    <div
                      key={cat.key}
                      className={`p-3 rounded-2xl border flex flex-col justify-between ${
                        points === 10
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : points === 5
                          ? 'bg-blue-50/40 border-blue-200'
                          : 'bg-slate-50/70 border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                          <span
                            className={`font-mono font-bold px-1.5 py-0.5 rounded-md text-[10px] ${
                              points === 10
                                ? 'bg-emerald-100 text-emerald-800'
                                : points === 5
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            +{points}
                          </span>
                          <span className="flex items-center gap-1">
                            <span>{cat.label}</span>
                            <span>{cat.icon}</span>
                          </span>
                        </div>

                        <div className="font-bold text-slate-900 text-sm truncate my-1" title={answerText}>
                          {answerText}
                        </div>
                      </div>

                      {/* Explanation note */}
                      <div className="text-[10px] text-slate-500 mt-1 pt-1 border-t border-slate-100">
                        {status === 'UNIQUE' && (
                          <span className="text-emerald-700 font-medium flex items-center gap-0.5">
                            <Check className="w-3 h-3" />
                            <span>فريدة</span>
                          </span>
                        )}
                        {status === 'DUPLICATE' && (
                          <span className="text-blue-700 font-medium truncate block" title={res?.reason}>
                            مكررة (+5)
                          </span>
                        )}
                        {status === 'INVALID_LETTER' && (
                          <span className="text-rose-600 font-medium flex items-center gap-0.5">
                            <AlertCircle className="w-3 h-3" />
                            <span>حرف غير مطابق</span>
                          </span>
                        )}
                        {status === 'EMPTY' && (
                          <span className="text-slate-400">فارغة</span>
                        )}
                        {status === 'MANUAL' && (
                          <span className="text-amber-700 font-medium">معدلة</span>
                        )}
                      </div>

                      {/* Host Quick Adjust Buttons if needed */}
                      {isHost && onAdjustScore && (
                        <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-slate-200/60 text-[10px]">
                          <span className="text-[9px] text-slate-400">تعديل:</span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => onAdjustScore(player.id, cat.key, 10)}
                              className={`px-1.5 py-0.5 rounded cursor-pointer ${points === 10 ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-200 text-slate-700 hover:bg-emerald-100'}`}
                            >
                              10
                            </button>
                            <button
                              type="button"
                              onClick={() => onAdjustScore(player.id, cat.key, 5)}
                              className={`px-1.5 py-0.5 rounded cursor-pointer ${points === 5 ? 'bg-blue-600 text-white font-bold' : 'bg-slate-200 text-slate-700 hover:bg-blue-100'}`}
                            >
                              5
                            </button>
                            <button
                              type="button"
                              onClick={() => onAdjustScore(player.id, cat.key, 0)}
                              className={`px-1.5 py-0.5 rounded cursor-pointer ${points === 0 ? 'bg-rose-600 text-white font-bold' : 'bg-slate-200 text-slate-700 hover:bg-rose-100'}`}
                            >
                              0
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Next Round Controls */}
      <div className="w-full max-w-md">
        {isHost ? (
          <div className="space-y-2">
            <button
              onClick={onNextRound}
              className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-extrabold text-lg rounded-2xl shadow-lg shadow-rose-300/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>بدأ حرف جديد</span>
              <ChevronRight className="w-5 h-5 rtl:rotate-180" />
            </button>
            <p className="text-center text-xs text-slate-500">
              الدور القادم في اختيار الحرف سيكون على: <strong className="font-bold text-rose-900">{nextPicker?.name || 'اللاعب التالي'}</strong>
            </p>
          </div>
        ) : (
          <div className="w-full p-4 bg-white border border-rose-200 rounded-2xl text-center text-rose-900 text-xs font-semibold flex items-center justify-center gap-2 shadow-xs">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>في انتظار مالك الغرفة للضغط على "بدأ حرف جديد"...</span>
          </div>
        )}
      </div>
    </div>
  );
};
