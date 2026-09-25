import React, { useState } from 'react';
import { X, Database, Check, ExternalLink } from 'lucide-react';
import { getActiveSupabaseCredentials, setCustomSupabaseCredentials } from '../utils/supabase.ts';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
}) => {
  const current = getActiveSupabaseCredentials();
  const [url, setUrl] = useState(current.url);
  const [key, setKey] = useState(current.key);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomSupabaseCredentials(url, key);
    setSaved(true);
  };

  const handleClear = () => {
    setCustomSupabaseCredentials('', '');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white border border-rose-100 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative text-right animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <Database className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-bold font-['Cairo'] text-slate-900">
            إعدادات قاعدة بيانات Supabase
          </h2>
        </div>

        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          تعمل اللعبة افتراضياً على السيرفر السحابي المدمج (Realtime Backend). إذا أردت ربط مشروعك الخاص على <strong>Supabase</strong> لحفظ الغرف واللاعبين في قاعدة بياناتك السحابية، يمكنك كتابة بيانات مشروعك هنا:
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Project URL (رابط المشروع)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
              dir="ltr"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Anon / Public Key (مفتاح الـ Anon)
            </label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              dir="ltr"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 space-y-1">
            <p className="font-bold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>الجداول المطلوبة في Supabase:</span>
            </p>
            <p>
              يحتوي المشروع على ملف جاهز باسم <code className="font-mono font-bold bg-white px-1 rounded">supabase-schema.sql</code> يمكنك نسخه ولصقه في <strong>SQL Editor</strong> في Supabase لإنشاء جداول <span className="font-mono">rooms</span> و <span className="font-mono">players</span> و <span className="font-mono">answers</span> بضغطة زر.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {saved ? 'تم الحفظ والتحميل...' : 'حفظ والربط مع Supabase'}
            </button>

            {current.isConfigured && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-xl transition-colors cursor-pointer"
              >
                إلغاء الربط
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
