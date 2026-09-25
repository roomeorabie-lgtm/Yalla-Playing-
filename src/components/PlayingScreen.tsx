import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CATEGORIES, CategoryKey, RoomState } from '../types/game.ts';
import { checkStartsWithLetter } from '../utils/arabic.ts';
import { Check, X, Send, Lock, Users, AlertCircle, Clock } from 'lucide-react';
import { sounds } from '../utils/sound.ts';

interface PlayingScreenProps {
  roomState: RoomState;
  playerId: string | null;
  isHost: boolean;
  onSubmitAnswers: (answers: Record<CategoryKey, string>) => void;
  onForceEndRound: () => void;
}

export const PlayingScreen: React.FC<PlayingScreenProps> = ({
  roomState,
  playerId,
  isHost,
  onSubmitAnswers,
  onForceEndRound,
}) => {
  const currentLetter = roomState.currentLetter || 'ا';
  const me = roomState.players.find((p) => p.id === playerId);
  const alreadySubmitted = me?.hasSubmitted ?? false;

  // Answers always start completely empty in every round
  const [answers, setAnswers] = useState<Record<CategoryKey, string>>({
    name: '',
    animal: '',
    plant: '',
    object: '',
    country: '',
  });

  const answersRef = useRef(answers);
  answersRef.current = answers;

  // Reset inputs to completely blank when a new round starts
  useEffect(() => {
    setAnswers({
      name: '',
      animal: '',
      plant: '',
      object: '',
      country: '',
    });
  }, [roomState.currentRound, roomState.currentLetter]);

  // Handle countdown sound tick and auto-submit
  const lastTickRef = useRef<number | null>(null);
  useEffect(() => {
    if (roomState.countdownSeconds !== null) {
      if (roomState.countdownSeconds !== lastTickRef.current) {
        lastTickRef.current = roomState.countdownSeconds;
        sounds.playTick(roomState.countdownSeconds);
      }

      // If countdown reaches 0 and player hasn't submitted yet, automatically submit whatever they have
      if (roomState.countdownSeconds === 0 && !alreadySubmitted) {
        onSubmitAnswers(answersRef.current);
      }
    }
  }, [roomState.countdownSeconds, alreadySubmitted, onSubmitAnswers]);

  const handleFieldChange = (key: CategoryKey, value: string) => {
    if (alreadySubmitted) return;
    setAnswers((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Check validation per field
  const fieldValidation = useMemo(() => {
    const status: Record<CategoryKey, { isValid: boolean; isEmpty: boolean }> = {
      name: { isValid: false, isEmpty: true },
      animal: { isValid: false, isEmpty: true },
      plant: { isValid: false, isEmpty: true },
      object: { isValid: false, isEmpty: true },
      country: { isValid: false, isEmpty: true },
    };

    (Object.keys(answers) as CategoryKey[]).forEach((key) => {
      const val = answers[key].trim();
      if (!val) {
        status[key] = { isValid: false, isEmpty: true };
      } else {
        const matches = checkStartsWithLetter(val, currentLetter);
        status[key] = { isValid: matches, isEmpty: false };
      }
    });

    return status;
  }, [answers, currentLetter]);

  const hasInvalidField = Object.values(fieldValidation).some(
    (f) => !f.isEmpty && !f.isValid
  );

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (alreadySubmitted) return;

    if (hasInvalidField) {
      sounds.playInvalid();
      return;
    }

    onSubmitAnswers(answers);
  };

  const isCountdownActive = roomState.countdownSeconds !== null && roomState.countdownSeconds > 0;

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 flex flex-col items-center">
      {/* Synchronized 5-Second Countdown Alert Banner */}
      {roomState.countdownSeconds !== null && (
        <div className="w-full mb-4 bg-gradient-to-r from-red-500 via-rose-600 to-amber-500 text-white rounded-3xl p-4 shadow-xl shadow-rose-500/30 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3 text-right">
            <Clock className="w-6 h-6 animate-spin text-amber-200 shrink-0" />
            <div>
              <p className="text-sm font-extrabold">
                {roomState.firstSubmitterName
                  ? `قام ${roomState.firstSubmitterName} بالتسليم! بدأ العد التنازلي:`
                  : 'بدأ العد التنازلي لإغلاق الجولة:'}
              </p>
              <p className="text-xs text-rose-100 font-medium">
                {alreadySubmitted
                  ? 'تم تسليم إجاباتكِ، في انتظار انتهاء الوقت'
                  : 'أكملي إجاباتكِ الآن قبل إغلاق الجولة تلقائياً!'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center bg-white text-rose-600 font-mono font-black text-3xl w-14 h-14 rounded-2xl shadow-inner shrink-0 scale-105">
            {roomState.countdownSeconds}
          </div>
        </div>
      )}

      {/* Big Letter Card */}
      <div className="w-full bg-gradient-to-b from-rose-500 to-pink-600 rounded-3xl p-5 text-white shadow-xl shadow-rose-200/50 text-center mb-4 relative overflow-hidden">
        <div className="text-xs uppercase tracking-widest text-rose-100 font-semibold mb-1">
          حرف الجولة الحالية
        </div>
        <div className="text-6xl md:text-7xl font-black font-['Cairo'] my-1 drop-shadow-sm">
          {currentLetter}
        </div>
        <p className="text-xs text-rose-100">
          اكتب كلمات تبدأ بحرف <strong className="text-white font-bold underline underline-offset-4 decoration-amber-300">({currentLetter})</strong>
        </p>
      </div>

      {/* Submissions Progress Indicator */}
      <div className="w-full bg-white border border-rose-100 rounded-2xl px-4 py-2.5 mb-4 shadow-xs flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
          <Users className="w-4 h-4 text-rose-500" />
          <span>تم تسليم إجابات:</span>
          <strong className="text-rose-950 font-bold font-mono">
            {roomState.submissionsCount} من {roomState.totalActivePlayers}
          </strong>
        </div>

        {alreadySubmitted ? (
          <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            <span>تم التسليم</span>
          </span>
        ) : isCountdownActive ? (
          <span className="text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full font-bold animate-pulse">
            تبقّى {roomState.countdownSeconds} ثوانٍ!
          </span>
        ) : (
          <span className="text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full font-semibold">
            جاري الكتابة...
          </span>
        )}
      </div>

      {/* Answers Form - Completely blank, no suggestive placeholders */}
      <form onSubmit={handleSubmit} className="w-full space-y-3">
        {CATEGORIES.map((cat) => {
          const val = fieldValidation[cat.key];
          const isError = !val.isEmpty && !val.isValid;
          const isSuccess = !val.isEmpty && val.isValid;

          return (
            <div
              key={cat.key}
              className={`bg-white border rounded-2xl p-3.5 transition-all text-right shadow-xs ${
                isError
                  ? 'border-rose-400 bg-rose-50/20'
                  : isSuccess
                  ? 'border-emerald-300 bg-emerald-50/20'
                  : 'border-slate-200 hover:border-rose-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  {isSuccess && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>صحيح</span>
                    </span>
                  )}
                  {isError && (
                    <span className="text-[11px] font-bold text-rose-600 flex items-center gap-0.5">
                      <X className="w-3.5 h-3.5" />
                      <span>يجب أن تبدأ بحرف ({currentLetter})</span>
                    </span>
                  )}
                </div>

                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>{cat.label}</span>
                  <span className="text-base select-none">{cat.icon}</span>
                </label>
              </div>

              <div className="relative">
                <input
                  type="text"
                  disabled={alreadySubmitted}
                  value={answers[cat.key]}
                  onChange={(e) => handleFieldChange(cat.key, e.target.value)}
                  placeholder="اكتب إجابتك"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none ${
                    alreadySubmitted
                      ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200'
                      : isError
                      ? 'bg-rose-50/60 border border-rose-300 text-rose-950 focus:ring-2 focus:ring-rose-400'
                      : isSuccess
                      ? 'bg-emerald-50/50 border border-emerald-300 text-emerald-950 focus:ring-2 focus:ring-emerald-400'
                      : 'bg-slate-50/70 border border-slate-200 text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-400'
                  }`}
                />
              </div>
            </div>
          );
        })}

        {/* Warning if any answer doesn't start with the letter */}
        {hasInvalidField && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>يجب تصحيح الكلمات التي لا تبدأ بحرف ({currentLetter}) قبل التسليم!</span>
          </div>
        )}

        {/* Submit Button */}
        {!alreadySubmitted ? (
          <button
            type="submit"
            disabled={hasInvalidField}
            className={`w-full py-4 text-white font-bold text-base rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2.5 ${
              hasInvalidField
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                : isCountdownActive
                ? 'bg-gradient-to-r from-amber-500 via-rose-600 to-pink-600 hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-rose-300/40 animate-pulse'
                : 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-rose-300/40 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>
              {isCountdownActive ? `تسليم فوراً (متبقي ${roomState.countdownSeconds}ث)` : 'تسليم'}
            </span>
          </button>
        ) : (
          <div className="w-full p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-1">
            <div className="flex items-center justify-center gap-2 text-emerald-900 font-bold text-sm">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>تم تسليم إجاباتك بنجاح!</span>
            </div>
            <p className="text-xs text-emerald-700">
              {roomState.countdownSeconds !== null
                ? `ينتهي العد التنازلي خلال ${roomState.countdownSeconds} ثوانٍ وتظهر النتائج للجميع تلقائياً.`
                : 'في انتظار باقي اللاعبين لتظهر النتائج للجميع تلقائياً...'}
            </p>
          </div>
        )}
      </form>

      {/* Host emergency force end button */}
      {isHost && (
        <div className="mt-6 pt-4 border-t border-slate-200 w-full text-center">
          <button
            onClick={() => {
              if (window.confirm('هل أنت متأكد من إنهاء الجولة الآن والانتقال للنتائج؟')) {
                onForceEndRound();
              }
            }}
            className="text-xs text-slate-500 hover:text-rose-600 underline cursor-pointer transition-colors"
          >
            إنهاء الجولة الآن كمالك الغرفة
          </button>
        </div>
      )}
    </div>
  );
};
