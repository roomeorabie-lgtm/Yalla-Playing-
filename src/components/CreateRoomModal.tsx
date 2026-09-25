import React, { useState } from 'react';
import { X, Sparkles, User, Target } from 'lucide-react';
import { AVATAR_OPTIONS } from '../types/game.ts';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (hostName: string, avatar: string, targetScore: 150 | 250 | 450) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('👑');
  const [targetScore, setTargetScore] = useState<150 | 250 | 450>(150);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('الرجاء كتابة اسمكِ الأول');
      return;
    }
    onCreate(name.trim(), selectedAvatar, targetScore);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white border border-rose-100 rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl mx-auto flex items-center justify-center mb-2 text-2xl">
            👑
          </div>
          <h2 className="text-2xl font-bold font-['Cairo'] text-rose-950">
            إنشاء غرفة جديدة
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ستكون مالك الغرفة وتتحكم في بدء الجولات
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-right">
          {/* First Name Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              الاسم الأول
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                placeholder="اكتب اسمك الأول (مثال: أحمد / سارة)"
                maxLength={20}
                autoFocus
                className="w-full px-4 py-3 bg-rose-50/40 border border-rose-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white text-sm"
              />
              <User className="absolute left-3 top-3.5 w-4 h-4 text-rose-400" />
            </div>
            {error && <p className="text-xs text-rose-600 font-semibold mt-1">{error}</p>}
          </div>

          {/* Avatar Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              اختر رمزك المفضل
            </label>
            <div className="grid grid-cols-6 gap-2 bg-rose-50/30 p-2.5 rounded-2xl border border-rose-100">
              {AVATAR_OPTIONS.map((av) => (
                <button
                  type="button"
                  key={av.id}
                  onClick={() => setSelectedAvatar(av.emoji)}
                  className={`w-10 h-10 text-xl flex items-center justify-center rounded-xl transition-transform cursor-pointer ${
                    selectedAvatar === av.emoji
                      ? 'bg-white shadow-md scale-110 border-2 border-rose-500 ring-2 ring-rose-200'
                      : 'hover:bg-white/70 hover:scale-105'
                  }`}
                >
                  {av.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Target Score Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-rose-500" />
                <span>النقاط المطلوبة للفوز باللعبة</span>
              </label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[150, 250, 450].map((score) => (
                <button
                  type="button"
                  key={score}
                  onClick={() => setTargetScore(score as 150 | 250 | 450)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    targetScore === score
                      ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-200'
                      : 'bg-white text-slate-700 border-rose-200 hover:border-rose-300 hover:bg-rose-50/50'
                  }`}
                >
                  {score} نقطة
                  <span className="block text-[10px] font-normal opacity-85 mt-0.5">
                    {score === 150 ? 'سريعة' : score === 250 ? 'متوسطة' : 'طويلة وممتعة'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold rounded-2xl shadow-lg shadow-rose-300/40 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>إنشاء الغرفة</span>
          </button>
        </form>
      </div>
    </div>
  );
};
