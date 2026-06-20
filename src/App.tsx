/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Camera, Book, Upload, Loader2, ChevronLeft, ChevronRight, Trash2, PlusCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { NutritionalInfo, DiaryEntry, DailySummary } from './types';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'diary'>('upload');
  
  // Storage for diary entries
  const [entries, setEntries] = useState<DiaryEntry[]>(() => {
    const saved = localStorage.getItem('foodDiary');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('foodDiary', JSON.stringify(entries));
  }, [entries]);

  return (
    <div className="min-h-screen font-sans text-white pb-20 relative overflow-x-hidden" style={{ background: 'radial-gradient(circle at 0% 0%, #0f172a 0%, #1e1b4b 50%, #312e81 100%)', backgroundAttachment: 'fixed' }}>
      {/* Animated Mesh Background Elements (Static) */}
      <div className="absolute top-[10%] left-[-100px] w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[20%] right-[-50px] w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <header className="h-16 px-4 md:px-8 flex items-center justify-between border-b border-white/10 backdrop-blur-md bg-white/5 z-10 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-400 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.4)]">
            <div className="w-4 h-4 border-2 border-slate-900"></div>
          </div>
          <span className="font-bold text-xl tracking-tight">НУТРИ<span className="text-emerald-400">СКАН</span> ИИ</span>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'upload' ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <UploadTab onAddEntry={(entry) => setEntries([entry, ...entries])} />
            </motion.div>
          ) : (
            <motion.div
              key="diary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <DiaryTab entries={entries} setEntries={setEntries} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 w-full bg-slate-900/80 backdrop-blur-md border-t border-white/10 pb-safe z-20">
        <div className="max-w-md mx-auto flex">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-4 flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
              activeTab === 'upload' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Camera className="w-6 h-6" />
            Скан
          </button>
          <button
            onClick={() => setActiveTab('diary')}
            className={`flex-1 py-4 flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
              activeTab === 'diary' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Book className="w-6 h-6" />
            Дневник
          </button>
        </div>
      </nav>
    </div>
  );
}

function UploadTab({ onAddEntry }: { onAddEntry: (e: DiaryEntry) => void }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<NutritionalInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addedToggle, setAddedToggle] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMimeType(file.type);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setResult(null);
        setError(null);
        setAddedToggle(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage || !mimeType) return;
    
    setIsAnalyzing(true);
    setError(null);
    try {
      const response = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: selectedImage,
          mimeType,
        }),
      });

      if (!response.ok) {
        let errMessage = 'Не удалось выполнить анализ';
        try {
          const errData = await response.json();
          if (errData.error) errMessage = errData.error;
        } catch (_) {}
        throw new Error(errMessage);
      }

      const data: NutritionalInfo = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка во время анализа.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addToDiary = () => {
    if (!result) return;
    
    const now = new Date();
    // Use local date string (YYYY-MM-DD)
    const dateStr = now.toLocaleDateString('en-CA'); // 'en-CA' outputs YYYY-MM-DD format commonly

    const newEntry: DiaryEntry = {
      id: crypto.randomUUID(),
      date: dateStr,
      timestamp: Date.now(),
      imageUrl: selectedImage || undefined,
      nutrition: result,
    };
    onAddEntry(newEntry);
    setAddedToggle(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-lg border-dashed border-white/30">
        {selectedImage ? (
           <div className="relative aspect-video sm:aspect-square bg-slate-800/50 flex items-center justify-center border-b border-white/10">
             <img src={selectedImage} alt="Selected food" className="w-full h-full object-cover" />
             <label className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur-sm p-3 rounded-full cursor-pointer shadow-sm hover:bg-slate-800 transition border border-white/10">
                <Camera className="w-5 h-5 text-emerald-400" />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
             </label>
           </div>
        ) : (
          <label className="flex flex-col items-center justify-center aspect-video sm:aspect-square hover:bg-white/5 transition-colors cursor-pointer border-b border-white/10 border-dashed p-8 text-center text-slate-400">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6 ring-8 ring-white/5">
               <Upload className="w-8 h-8 text-emerald-400" />
            </div>
            <span className="text-sm font-medium text-slate-300">Нажмите, чтобы загрузить фото блюда</span>
            <span className="text-xs text-slate-500 mt-2">JPEG, PNG, WEBP</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </label>
        )}

        <div className="p-6">
           <button
             onClick={analyzeImage}
             disabled={!selectedImage || isAnalyzing}
             className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-[0_10px_20px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
           >
             {isAnalyzing ? (
               <>
                 <Loader2 className="w-5 h-5 animate-spin" />
                 Анализ...
               </>
             ) : (
               'Анализировать фото'
             )}
           </button>
           {error && (
             <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm flex items-start gap-2">
               <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
               <p>{error}</p>
             </div>
           )}
        </div>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-500/10 backdrop-blur-xl border border-emerald-500/20 rounded-3xl p-6 shadow-lg space-y-5"
          >
            <div>
              <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">Анализ завершен</span>
              <h2 className="text-xl font-bold text-white mt-1">{result.foodName}</h2>
              <p className="text-sm text-slate-400 mt-2">{result.description}</p>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="bg-white/5 rounded-xl p-2 border border-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-bold text-emerald-400">{result.calories}</span>
                <span className="text-[10px] text-slate-400 uppercase">ккал</span>
              </div>
              <div className="bg-white/5 rounded-xl p-2 border border-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-lg font-bold text-white">{result.protein}г</span>
                <span className="text-[10px] text-slate-400 uppercase">Белки</span>
              </div>
              <div className="bg-white/5 rounded-xl p-2 border border-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-lg font-bold text-white">{result.carbs}г</span>
                <span className="text-[10px] text-slate-400 uppercase">Углеводы</span>
              </div>
              <div className="bg-white/5 rounded-xl p-2 border border-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-lg font-bold text-white">{result.fat}г</span>
                <span className="text-[10px] text-slate-400 uppercase">Жиры</span>
              </div>
            </div>

            <button
              onClick={addToDiary}
              disabled={addedToggle || result.foodName === 'Не еда' || result.foodName === 'Not Food'}
              className={`w-full py-3 px-4 rounded-xl font-bold transition flex items-center justify-center gap-2 border ${
                addedToggle
                  ? 'bg-white/5 border-white/5 text-slate-500 cursor-default'
                  : 'bg-white/10 border-white/20 text-white hover:bg-white/20 shadow-sm'
              }`}
            >
              {addedToggle ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  В дневнике
                </>
              ) : (
                <>
                  <PlusCircle className="w-5 h-5" />
                  В дневник
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DiaryTab({ entries, setEntries }: { entries: DiaryEntry[], setEntries: React.Dispatch<React.SetStateAction<DiaryEntry[]>> }) {
  // Use local date for displaying today's date properly based on timezone
  const todayStr = new Date().toLocaleDateString('en-CA');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const currentDateObj = new Date(selectedDate);

  const goToPreviousDay = () => {
    const prev = new Date(currentDateObj);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev.toLocaleDateString('en-CA'));
  };

  const goToNextDay = () => {
    const next = new Date(currentDateObj);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next.toLocaleDateString('en-CA'));
  };

  const isToday = selectedDate === todayStr;

  const displayDate = isToday 
    ? 'Сегодня' 
    : new Intl.DateTimeFormat('ru-RU', { weekday: 'short', month: 'short', day: 'numeric' }).format(currentDateObj);

  const daysEntries = entries.filter(e => e.date === selectedDate).sort((a, b) => b.timestamp - a.timestamp);

  const summary = daysEntries.reduce(
    (acc, entry) => ({
      calories: acc.calories + entry.nutrition.calories,
      protein: acc.protein + entry.nutrition.protein,
      carbs: acc.carbs + entry.nutrition.carbs,
      fat: acc.fat + entry.nutrition.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const deleteEntry = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between bg-white/5 backdrop-blur-xl rounded-2xl p-2 border border-white/10 shadow-lg relative z-10">
        <button onClick={goToPreviousDay} className="p-2 hover:bg-white/10 rounded-full transition">
          <ChevronLeft className="w-5 h-5 text-slate-300" />
        </button>
        <span className="font-bold text-white tracking-widest uppercase text-sm">{displayDate}</span>
        <button onClick={goToNextDay} disabled={isToday} className={`p-2 rounded-full transition ${isToday ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10'}`}>
          <ChevronRight className="w-5 h-5 text-slate-300" />
        </button>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-lg relative z-10">
        <h3 className="text-lg font-semibold mb-4 text-white">Прогресс за день</h3>
        
        <div className="flex items-center justify-between mb-6">
           <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="50" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8"/>
                <circle cx="56" cy="56" r="50" fill="transparent" stroke="#34d399" strokeWidth="8" strokeDasharray="314" strokeDashoffset={Math.max(0, 314 - (314 * Math.min(summary.calories / 2000, 1)))} strokeLinecap="round"/>
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-bold text-white">{Math.round((summary.calories / 2000) * 100)}%</span>
                <span className="text-[10px] text-slate-400 uppercase">Цель</span>
              </div>
           </div>
           <div className="flex-1 pl-8">
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Съедено</span>
                  <span className="font-bold text-white">{summary.calories} ккал</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full">
                  <div className="bg-indigo-400 h-1.5 rounded-full" style={{ width: `${Math.min((summary.calories / 2000) * 100, 100)}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Лимит</span>
                  <span className="font-bold text-emerald-400">2 000 ккал</span>
                </div>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
           <div className="bg-white/5 rounded-xl p-3 border border-white/5">
             <div className="text-[10px] text-slate-400 uppercase mb-1">Белки</div>
             <div className="font-bold text-white">{summary.protein}г</div>
             <div className="w-full h-1 bg-white/10 rounded-full mt-2">
               <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${Math.min((summary.protein / 50) * 100, 100)}%` }} />
             </div>
           </div>
           <div className="bg-white/5 rounded-xl p-3 border border-white/5">
             <div className="text-[10px] text-slate-400 uppercase mb-1">Углеводы</div>
             <div className="font-bold text-white">{summary.carbs}г</div>
             <div className="w-full h-1 bg-white/10 rounded-full mt-2">
               <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.min((summary.carbs / 250) * 100, 100)}%` }} />
             </div>
           </div>
           <div className="bg-white/5 rounded-xl p-3 border border-white/5">
             <div className="text-[10px] text-slate-400 uppercase mb-1">Жиры</div>
             <div className="font-bold text-white">{summary.fat}г</div>
             <div className="w-full h-1 bg-white/10 rounded-full mt-2">
               <div className="h-full bg-slate-400 rounded-full" style={{ width: `${Math.min((summary.fat / 70) * 100, 100)}%` }} />
             </div>
           </div>
        </div>
      </div>

      <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col shadow-lg relative z-10">
        <h3 className="text-lg font-semibold mb-4 text-white">Недавние записи</h3>
        <div className="flex-1 flex flex-col gap-3">
        {daysEntries.length === 0 ? (
          <div className="text-center py-8 bg-white/5 rounded-2xl border border-white/10 border-dashed">
            <p className="text-slate-400 text-sm">В этот день не было записей о еде.</p>
          </div>
        ) : (
          daysEntries.map((entry) => (
            <motion.div
              layout
              key={entry.id}
              className="bg-white/5 rounded-2xl p-4 flex items-center gap-4 border border-white/5"
            >
              {entry.imageUrl ? (
                <img src={entry.imageUrl} alt={entry.nutrition.foodName} className="w-12 h-12 rounded-xl object-cover bg-slate-800/50 shrink-0 border border-white/10" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 border border-white/10 text-indigo-400">
                  <Book className="w-6 h-6" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white truncate">{entry.nutrition.foodName}</div>
                <div className="text-[10px] text-slate-400 uppercase mt-1">
                   {entry.nutrition.protein}г Б • {entry.nutrition.carbs}г У • {entry.nutrition.fat}г Ж
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="text-sm font-bold text-emerald-400">{entry.nutrition.calories} ккал</div>
                <button
                  onClick={() => deleteEntry(entry.id)}
                  className="text-[10px] font-bold text-slate-500 hover:text-rose-400 transition"
                  aria-label="Удалить запись"
                >
                  УДАЛИТЬ
                </button>
              </div>
            </motion.div>
          ))
        )}
        </div>
      </div>
    </div>
  );
}

