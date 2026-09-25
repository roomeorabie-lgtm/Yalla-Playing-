import React, { useState } from 'react';
import { PlusCircle, LogIn, Sparkles, HelpCircle, CheckCircle, ShieldAlert, Award } from 'lucide-react';
import gameLogo from '../assets/images/yalla_playing_logo_1790320843090.jpg';

interface HomeScreenProps {
  onCreateRoomClick: () => void;
  onQuickJoinClick: () => void;
  invitedRoomCode?: string | null;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onCreateRoomClick,
  onQuickJoinClick,
  invitedRoomCode,
}) => {
  const [showRules, setShowRules] = useState(false);

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8 flex flex-col items-center text-center">
      {/* Invited Room Banner */}
      {invitedRoomCode && (
        <div className="w-full mb-6 bg-gradient-to-r from-amber-50 to-rose-50 border-2 border-rose-300 rounded-2xl p-4 shadow-sm flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-3 text-right">
            <span className="text-2xl">💌</span>
            <div>
              <p className="text-sm font-bold text-rose-950">تمت دعوتك للانضمام إلى الغرفة!</p>
              <p className="text-xs text-rose-700">رقم الغرفة: <span className="font-bold text-base tracking-widest">{invitedRoomCode}</span></p>
            </div>
          </div>
          <button
            onClick={onQuickJoinClick}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            دخول الآن
          </button>
        </div>
      )}

      {/* Hero Badge & Logo */}
      <div className="relative mb-4">
        <div className="w-32 h-32 md:w-36 md:h-36 rounded-3xl overflow-hidden border-4 border-white shadow-xl shadow-rose-200/50 bg-rose-100 flex items-center justify-center">
          <img
            src={gameLogo}
            alt="شعار Yalla Playing"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <span className="text-6xl select-none" aria-hidden="true">🎉</span>
        </div>
        <div className="absolute -bottom-2 -left-2 bg-amber-400 text-amber-950 text-xs font-black px-2.5 py-0.5 rounded-full border border-white shadow-sm flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-800" />
          <span>أونلاين</span>
        </div>
      </div>

      {/* Main Title & Tagline */}
      <h1 className="text-3xl md:text-5xl font-black font-['Cairo'] text-rose-950 mb-2 tracking-tight">
        Yalla Playing
      </h1>
      <p className="text-slate-600 text-sm md:text-base max-w-md mb-8 leading-relaxed">
        لعبة الكلمات الجماعية أونلاين: ولد، بنت، حيوان، نبات، جماد، بلد بحروف الأبجدية والتنافس المباشر!
      </p>

      {/* Primary Action Buttons */}
      <div className="w-full space-y-3.5 mb-8">
        <button
          onClick={onCreateRoomClick}
          className="w-full py-4 px-6 bg-gradient-to-r from-rose-500 via-rose-600 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-lg rounded-2xl shadow-lg shadow-rose-300/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 cursor-pointer"
        >
          <PlusCircle className="w-6 h-6 text-white" />
          <span>إنشاء غرفة جديدة</span>
        </button>

        <button
          onClick={onQuickJoinClick}
          className="w-full py-4 px-6 bg-white hover:bg-rose-50/50 text-rose-900 border-2 border-rose-200 hover:border-rose-300 font-bold text-lg rounded-2xl shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 cursor-pointer"
        >
          <LogIn className="w-6 h-6 text-rose-600" />
          <span>الدخول السريع</span>
        </button>
      </div>

      {/* Rules Accordion Toggle */}
      <div className="w-full max-w-md bg-white border border-rose-100 rounded-2xl shadow-xs overflow-hidden text-right">
        <button
          onClick={() => setShowRules(!showRules)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-rose-950 font-bold text-sm hover:bg-rose-50/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-rose-500" />
            <span>قواعد اللعبة ونظام الـ 5 ثوانٍ</span>
          </div>
          <span className="text-xs text-rose-600 font-medium">
            {showRules ? 'إخفاء ▲' : 'عرض التفاصيل ▼'}
          </span>
        </button>

        {showRules && (
          <div className="px-5 pb-5 pt-2 border-t border-rose-50 text-xs md:text-sm text-slate-700 space-y-3 leading-relaxed">
            <div className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <p>
                <strong>الخانات الخمس:</strong> اسم ولد أو بنت، حيوان، نبات، جماد، بلد. يجب أن تبدأ كل إجابة بحرف الجولة.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="text-base leading-none shrink-0 mt-0.5">⏱️</span>
              <p>
                <strong>نظام الـ 5 ثوانٍ:</strong> بمجرد أن يضغط أول لاعب على "تسليم"، يبدأ عداد تنازلي مدته 5 ثوانٍ للجميع، ثم تُغلق الجولة وتُسلّم الإجابات تلقائياً.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <Award className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <p>
                <strong>إجابة صحيحة فريدة:</strong> <span className="font-bold text-emerald-700">10 نقاط</span> لكل خانة لا تتكرر مع باقي اللاعبين.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <Award className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p>
                <strong>إجابة مكررة:</strong> <span className="font-bold text-blue-700">5 نقاط</span> لكل لاعب كتب نفس الإجابة.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <p>
                <strong>إجابة مخالفة للحرف أو فارغة:</strong> <span className="font-bold text-rose-700">0 نقطة</span>.
              </p>
            </div>

            <div className="p-2.5 bg-rose-50/60 rounded-xl text-rose-900 text-xs">
              👑 يستمر التنافس حتى يصل أحد اللاعبين إلى النقاط المحددة للعبة (150 أو 250 أو 450 نقطة).
            </div>
          </div>
        )}
      </div>

      {/* Footer text */}
      <p className="mt-8 text-xs text-slate-400">
        Yalla Playing © {new Date().getFullYear()} · لعبة التحدي والضحك مع الأصدقاء والعائلة
      </p>
    </div>
  );
};
