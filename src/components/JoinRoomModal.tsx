import React, { useState, useEffect } from 'react';
import { X, LogIn, User, Hash } from 'lucide-react';
import { AVATAR_OPTIONS } from '../types/game.ts';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (roomCode: string, playerName: string, avatar: string) => void;
  initialRoomCode?: string | null;
  serverError?: string | null;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  onJoin,
  initialRoomCode,
  serverError,
}) => {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🌸');
  const [clientError, setClientError] = useState('');

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode);
    }
  }, [initialRoomCode]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setClientError('الرجاء كتابة اسمك الأول');
      return;
    }
    const cleanCode = roomCode.trim();
    if (!cleanCode || cleanCode.length !== 4) {
      setClientError('الرجاء كتابة رقم الغرفة المكون من 4 أرقام');
      return;
    }
    setClientError('');
    onJoin(cleanCode, name.trim(), selectedAvatar);
  };

  const displayError = clientError || serverError;

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
          <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-2xl mx-auto flex items-center justify-center mb-2 text-2xl">
            ✨
          </div>
          <h2 className="text-2xl font-bold font-['Cairo'] text-rose-950">
            الدخول السريع
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            انضم إلى غرفة أصدقائك واكتب رقم الغرفة
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-right">
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
                  setClientError('');
                }}
                placeholder="اكتب اسمك الأول"
                maxLength={20}
                autoFocus
                className="w-full px-4 py-3 bg-rose-50/40 border border-rose-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white text-sm"
              />
              <User className="absolute left-3 top-3.5 w-4 h-4 text-rose-400" />
            </div>
          </div>

          {/* Room Code Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              رقم الغرفة (4 أرقام)
            </label>
            <div className="relative">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setRoomCode(val);
                  setClientError('');
                }}
                placeholder="مثال: 4827"
                maxLength={4}
                className="w-full px-4 py-3 bg-rose-50/40 border border-rose-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white text-lg tracking-widest font-mono text-center font-bold"
              />
              <Hash className="absolute left-3 top-3.5 w-4 h-4 text-rose-400" />
            </div>
          </div>

          {/* Avatar Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              اختاري رمزكِ المفضل
            </label>
            <div className="grid grid-cols-6 gap-2 bg-rose-50/30 p-2 rounded-2xl border border-rose-100">
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

          {displayError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold text-center">
              {displayError}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold rounded-2xl shadow-lg shadow-rose-300/40 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <LogIn className="w-4 h-4" />
            <span>دخول الغرفة</span>
          </button>
        </form>
      </div>
    </div>
  );
};
