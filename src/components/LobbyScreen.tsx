import React, { useState } from 'react';
import { Copy, Check, Play, Share2, Target, MessageSquare } from 'lucide-react';
import { RoomState } from '../types/game.ts';
import { sounds } from '../utils/sound.ts';

interface LobbyScreenProps {
  roomState: RoomState;
  playerId: string | null;
  isHost: boolean;
  onStartGame: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  roomState,
  playerId,
  isHost,
  onStartGame,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(roomState.code);
    sounds.playPop();
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyShareLink = () => {
    const origin = window.location.origin;
    const shareUrl = `${origin}?room=${roomState.code}`;
    navigator.clipboard.writeText(shareUrl);
    sounds.playPop();
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareViaWhatsApp = () => {
    const origin = window.location.origin;
    const shareUrl = `${origin}?room=${roomState.code}`;
    const text = encodeURIComponent(`تعال العب معنا في لعبة Yalla Playing! 🎉\nرقم الغرفة: ${roomState.code}\nرابط الدخول المباشر: ${shareUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 flex flex-col items-center">
      {/* Room Code Card */}
      <div className="w-full bg-white border-2 border-rose-200 rounded-3xl p-6 shadow-md text-center mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-rose-400 via-pink-500 to-amber-400" />
        
        <p className="text-xs font-bold text-slate-500 mb-1">
          رقم الغرفة لمشاركته مع أصدقائك
        </p>

        <div className="my-2 flex items-center justify-center gap-3">
          <span className="text-4xl md:text-5xl font-black font-mono tracking-widest text-rose-900 bg-rose-50/70 border border-rose-200/80 px-6 py-2 rounded-2xl shadow-inner">
            {roomState.code}
          </span>
          <button
            onClick={copyCode}
            title="نسخ رقم الغرفة"
            className="p-3 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-2xl transition-all cursor-pointer shadow-xs active:scale-95"
            aria-label="نسخ رقم الغرفة"
          >
            {copiedCode ? <Check className="w-6 h-6 text-emerald-600" /> : <Copy className="w-6 h-6" />}
          </button>
        </div>

        {/* Share buttons */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={copyShareLink}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'تم نسخ الرابط!' : 'نسخ رابط الغرفة'}</span>
          </button>

          <button
            onClick={shareViaWhatsApp}
            className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>مشاركة عبر واتساب</span>
          </button>
        </div>

        {/* Target score tag */}
        <div className="mt-4 pt-3 border-t border-rose-100 flex items-center justify-center gap-2 text-xs text-rose-700 font-medium">
          <Target className="w-4 h-4 text-rose-500" />
          <span>الهدف للفوز باللعبة: <strong className="font-bold text-rose-950">{roomState.targetScore} نقطة</strong></span>
        </div>
      </div>

      {/* Players List in Lobby */}
      <div className="w-full bg-white border border-rose-100 rounded-3xl p-5 shadow-xs mb-6 text-right">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-slate-500 font-medium">
            في انتظار دخول الجميع
          </span>
          <h3 className="text-sm font-bold text-rose-950 flex items-center gap-2">
            <span>اللاعبات الموجودات</span>
            <span className="bg-rose-100 text-rose-800 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold">
              {roomState.players.length}
            </span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {roomState.players.map((player) => {
            const isMe = player.id === playerId;
            return (
              <div
                key={player.id}
                className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                  isMe
                    ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-200'
                    : 'bg-white border-slate-200/80 hover:border-rose-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-rose-100 flex items-center justify-center text-xl shrink-0">
                    {player.avatar || '🌸'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-900">
                        {player.name}
                      </span>
                      {player.isHost && (
                        <span title="مالكة الغرفة" className="text-base select-none">
                          👑
                        </span>
                      )}
                    </div>
                    {isMe && (
                      <span className="text-[10px] text-rose-600 font-semibold">
                        (أنتِ)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      player.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                    }`}
                    title={player.isConnected ? 'متصلة' : 'غير متصلة'}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Start Game Controls */}
      <div className="w-full">
        {isHost ? (
          <div className="space-y-2">
            <button
              onClick={onStartGame}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-lg rounded-2xl shadow-lg shadow-emerald-200/50 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>بدأ اللعبة</span>
            </button>
            <p className="text-center text-xs text-slate-500">
              أنت مالك الغرفة 👑، اضغط "بدأ اللعبة" بعد انضمام جميع أصدقائك
            </p>
          </div>
        ) : (
          <div className="w-full p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-center text-amber-900 text-xs font-semibold flex items-center justify-center gap-2">
            <span className="text-lg">⏳</span>
            <span>في انتظار مالك الغرفة لبدء اللعبة... استعد!</span>
          </div>
        )}
      </div>
    </div>
  );
};
