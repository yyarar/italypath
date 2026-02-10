import React, { useState, useMemo, useEffect, useRef } from 'react';
import katex from 'katex';
import { 
  BookOpen, 
  Calculator, 
  Brain, 
  ArrowLeft, 
  ArrowRight, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  FlaskConical, 
  GraduationCap, 
  AlertCircle, 
  Trophy, 
  Lightbulb, 
  Sigma, 
  PieChart, 
  TrendingUp, 
  Shapes, 
  Dna, 
  Atom,
  Search,
  Timer as TimerIcon,
  Clock,
  Zap,
  Award
} from 'lucide-react';
// ESKİSİNİ SİL, BUNU YAPIŞTIR:
import { generateQuizQuestions } from '@/services/gemini'; // @ işareti kök dizini temsil eder
import { QuizData, QuizState, Topic } from '@/types';      // @ işareti kök dizini temsil eder

// --- UTILS & CONSTANTS ---

// Format seconds into MM:SS
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Rank System Logic
const getRank = (score: number, total: number) => {
  const percentage = (score / total) * 100;
  if (percentage === 100) return { title: "Leggenda Italiana", color: "text-purple-600", bg: "bg-purple-100", icon: <Award className="w-6 h-6" /> };
  if (percentage >= 80) return { title: "Maestro Accademico", color: "text-emerald-600", bg: "bg-emerald-100", icon: <Trophy className="w-6 h-6" /> };
  if (percentage >= 60) return { title: "Studente Diligente", color: "text-blue-600", bg: "bg-blue-100", icon: <BookOpen className="w-6 h-6" /> };
  if (percentage >= 40) return { title: "Apprendista", color: "text-amber-600", bg: "bg-amber-100", icon: <Lightbulb className="w-6 h-6" /> };
  return { title: "Novizio", color: "text-gray-600", bg: "bg-gray-100", icon: <Brain className="w-6 h-6" /> };
};

// LaTeX Rendering Component (Memoized for performance)
const RenderLatex = React.memo(({ text }: { text: string }) => {
  if (!text) return null;

  const parts = useMemo(() => text.split(/(\$[^\$]+\$)/g), [text]);

  return (
    <span>
      {parts.map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          const content = part.slice(1, -1);
          try {
            const html = katex.renderToString(content, {
              throwOnError: false,
              displayMode: false,
              strict: false,
              trust: true
            });
            return (
              <span 
                key={index} 
                dangerouslySetInnerHTML={{ __html: html }} 
                className="katex-wrapper" 
              />
            );
          } catch (e) {
            console.warn("LaTeX render error:", e);
            return <span key={index} className="text-red-400">{part}</span>;
          }
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
});
RenderLatex.displayName = 'RenderLatex';

const MATH_CATEGORIES = [
  {
    title: "Heart of Algebra",
    icon: <Sigma className="w-5 h-5" />,
    topics: ["Linear Equations", "Systems of Equations", "Linear Inequalities", "Absolute Value & Graphs"]
  },
  {
    title: "Passport to Advanced Math",
    icon: <TrendingUp className="w-5 h-5" />,
    topics: ["Quadratic Functions", "Exponentials & Radicals", "Polynomials & Factors", "Function Notation"]
  },
  {
    title: "Data Analysis",
    icon: <PieChart className="w-5 h-5" />,
    topics: ["Ratios, Rates & Percentages", "Probability", "Statistics (Mean, Median, Mode)", "Scatterplots & Data Interpretation"]
  },
  {
    title: "Geometry & Trig",
    icon: <Shapes className="w-5 h-5" />,
    topics: ["Lines, Angles & Triangles", "Circles, Area & Volume", "Trigonometry", "Complex Numbers"]
  }
];

// --- SUB-COMPONENTS ---

// Live Timer Component
const TimerDisplay = ({ startTime }: { startTime: number }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="flex items-center gap-1.5 font-mono text-sm font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
      <TimerIcon className="w-3.5 h-3.5 text-gray-500" />
      {formatTime(elapsed)}
    </div>
  );
};

const Header = ({ view, goHome }: { view: string, goHome: () => void }) => (
  <header className="w-full max-w-3xl flex items-center justify-between mb-8">
    <div className="flex items-center gap-2">
      <div className="bg-azure p-2 rounded-lg shadow-md">
        <GraduationCap className="text-white w-6 h-6" />
      </div>
      <h1 className="text-2xl font-bold text-azure tracking-tight">ItalyPath</h1>
    </div>
    
    {view !== 'TOPIC_SELECTION' && (
      <button 
        onClick={goHome}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-azure transition-colors px-3 py-2 rounded-lg hover:bg-white"
      >
        <ArrowLeft className="w-4 h-4" />
        Ana Sayfa
      </button>
    )}
  </header>
);

const TopicCard = ({ icon, title, desc, onClick }: { icon: React.ReactNode, title: string, desc: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-azure hover:shadow-md transition-all duration-200 text-left flex items-start gap-4"
  >
    <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-blue-50 transition-colors">
      {icon}
    </div>
    <div>
      <h3 className="font-bold text-lg text-gray-900 group-hover:text-azure transition-colors">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{desc}</p>
    </div>
  </button>
);

const TopicSelectionView = ({ onSelect }: { onSelect: (t: Topic) => void }) => (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="text-center mb-10">
      <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Hazırlık Modülü</h2>
      <p className="text-lg text-gray-600 max-w-md mx-auto">
        TOLC ve IMAT sınavları için yapay zeka destekli soru pratiği yapın.
      </p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <TopicCard icon={<Brain className="w-8 h-8 text-azure" />} title="Logic" desc="Mantıksal çıkarım ve eleştirel düşünme" onClick={() => onSelect('Logic')} />
      <TopicCard icon={<Calculator className="w-8 h-8 text-terracotta" />} title="Math" desc="SAT & TOLC Matematik Konuları" onClick={() => onSelect('Math')} />
      <TopicCard icon={<BookOpen className="w-8 h-8 text-emerald-600" />} title="General Knowledge" desc="İtalyan kültürü ve genel kültür" onClick={() => onSelect('General Knowledge')} />
      <TopicCard icon={<FlaskConical className="w-8 h-8 text-purple-600" />} title="Science" desc="Biyoloji, Kimya ve Fizik" onClick={() => onSelect('Science')} />
    </div>
  </div>
);

const SubTopicView = ({ selectedTopic, onStartQuiz }: { selectedTopic: Topic, onStartQuiz: (topic: Topic, sub: string | null) => void }) => (
  <div className="animate-in fade-in slide-in-from-right-4 duration-500">
    <div className="text-center mb-8">
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 ${
        selectedTopic === 'Math' ? 'bg-blue-100 text-azure' : 'bg-purple-100 text-purple-600'
      }`}>
        {selectedTopic === 'Math' ? 'SAT Matematik' : 'Fen Bilimleri (IMAT/TOLC)'}
      </span>
      <h2 className="text-3xl font-bold text-gray-900">Konu Seçimi</h2>
      <p className="text-gray-600 mt-2">
        {selectedTopic === 'Math' ? 'Hangi matematik alanında pratik yapmak istersin?' : 'Hangi fen branşında pratik yapmak istersin?'}
      </p>
    </div>

    {selectedTopic === 'Math' ? (
      <div className="space-y-6">
        {MATH_CATEGORIES.map((category, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-blue-100 transition-colors">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-orange-50 rounded-lg text-terracotta">{category.icon}</div>
              <h3 className="font-bold text-lg text-gray-800">{category.title}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {category.topics.map((t) => (
                <button
                  key={t}
                  onClick={() => onStartQuiz('Math', t)}
                  className="text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-blue-50 hover:text-azure border border-gray-100 hover:border-blue-200 transition-all duration-200 text-sm font-medium text-gray-600 group"
                >
                  <span className="flex items-center justify-between">
                    {t}
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TopicCard icon={<Dna className="w-8 h-8 text-emerald-500" />} title="Biology" desc="Hücre, genetik, anatomi ve fizyoloji" onClick={() => onStartQuiz('Science', 'Biology')} />
        <TopicCard icon={<FlaskConical className="w-8 h-8 text-rose-500" />} title="Chemistry" desc="Periyodik tablo, bağlar ve reaksiyonlar" onClick={() => onStartQuiz('Science', 'Chemistry')} />
        <TopicCard icon={<Atom className="w-8 h-8 text-blue-500" />} title="Physics" desc="Mekanik, termodinamik ve elektrik" onClick={() => onStartQuiz('Science', 'Physics')} />
      </div>
    )}
  </div>
);

const LoadingView = ({ state }: { state: QuizState }) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] animate-in fade-in duration-300">
    {state.selectedTopic && (
      <div className="w-full max-w-md mb-8">
        <div className="flex justify-between text-sm font-medium text-gray-500 mb-2">
          <span>Soru {state.currentQuestionIndex} / {state.totalQuestions}</span>
          <span>{state.subTopic ? state.subTopic : state.selectedTopic}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div 
            className="bg-azure h-2.5 rounded-full transition-all duration-500 ease-out opacity-50" 
            style={{ width: `${(state.currentQuestionIndex / state.totalQuestions) * 100}%` }}
          ></div>
        </div>
      </div>
    )}
    <div className="relative w-16 h-16 mb-6">
      <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
      <div className="absolute inset-0 border-4 border-azure border-t-transparent rounded-full animate-spin"></div>
    </div>
    <h3 className="text-xl font-semibold text-gray-800 animate-pulse">Sorular Hazırlanıyor...</h3>
    <p className="text-gray-500 mt-2">Gemini sizin için özgün bir test serisi üretiyor.</p>
  </div>
);

const QuizView = ({ 
  state, 
  handleOptionClick, 
  handleNext, 
  revealHint 
}: { 
  state: QuizState, 
  handleOptionClick: (opt: string) => void, 
  handleNext: () => void, 
  revealHint: () => void 
}) => {
  const quizData = state.quizData!;
  
  const getOptionStyle = (option: string) => {
    const baseStyle = "w-full p-4 text-left rounded-xl border-2 transition-all duration-200 font-medium relative overflow-hidden";
    const selected = state.selectedOption;
    const correct = quizData.correctAnswer;

    if (!selected) return `${baseStyle} border-gray-200 hover:border-azure hover:bg-blue-50 text-gray-700`;
    if (option === correct) return `${baseStyle} border-green-500 bg-green-50 text-green-800 shadow-[0_0_15px_rgba(34,197,94,0.3)] transform scale-[1.01]`;
    if (option === selected && option !== correct) return `${baseStyle} border-red-500 bg-red-50 text-red-800 shadow-[0_0_10px_rgba(239,68,68,0.2)]`;
    return `${baseStyle} border-gray-100 text-gray-400 opacity-60`;
  };

  const getSelectedIndex = () => state.selectedOption ? quizData.options.indexOf(state.selectedOption) : -1;

  return (
    <div className="animate-in zoom-in-95 duration-300">
      {/* Progress Bar & Timer */}
      <div className="mb-6 px-1 space-y-2">
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-azure tracking-wide uppercase">{state.selectedTopic}</span>
            {state.subTopic && <span className="text-xs font-semibold text-gray-500">{state.subTopic}</span>}
          </div>
          <div className="flex items-center gap-2 sm:gap-4 text-sm flex-wrap justify-end">
            {state.startTime && <TimerDisplay startTime={state.startTime} />}
            
            <span className="hidden sm:flex items-center gap-1.5 font-medium px-2 py-1 rounded-md border border-green-100 bg-green-50 text-green-700">
              <Trophy className="w-3.5 h-3.5" />
              Skor: {state.score}
            </span>
            <span className={`flex items-center gap-1.5 font-medium px-2 py-1 rounded-md border transition-colors ${
              state.hintsRemaining > 0 ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-gray-400 bg-gray-100 border-gray-200'
            }`}>
              <Lightbulb className={`w-3.5 h-3.5 ${state.hintsRemaining > 0 ? 'fill-amber-500 text-amber-500' : 'text-gray-400'}`} />
              {state.hintsRemaining} İpucu
            </span>
            <span className="font-medium text-gray-500">
              <span className="text-gray-900 font-bold">{state.currentQuestionIndex}</span> / {state.totalQuestions}
            </span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden shadow-inner">
          <div 
            className="bg-gradient-to-r from-azure to-blue-400 h-2.5 rounded-full transition-all duration-700 ease-out" 
            style={{ width: `${(state.currentQuestionIndex / state.totalQuestions) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative">
        {/* Question Header */}
        <div className="bg-gradient-to-r from-azure to-blue-700 p-6 md:p-8 text-white relative">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); revealHint(); }}
            disabled={state.hintsRemaining === 0 || state.hintRevealed || !!state.selectedOption}
            className={`absolute top-6 right-6 z-20 p-3 rounded-full shadow-lg transition-all duration-300 ring-1 ring-white/20 backdrop-blur-sm ${
              state.hintRevealed ? 'bg-amber-400 text-white cursor-default scale-110 shadow-amber-900/20' : 
              state.hintsRemaining > 0 && !state.selectedOption ? 'bg-white/20 hover:bg-white text-white hover:text-amber-500 cursor-pointer hover:scale-105 active:scale-95' : 
              'bg-black/20 text-white/40 cursor-not-allowed'
            }`}
            title={state.hintRevealed ? "İpucu Açık" : state.selectedOption ? "Soru cevaplandı" : "İpucu Kullan (1 Puan)"}
          >
            <Lightbulb className={`w-6 h-6 ${state.hintRevealed ? 'fill-white' : ''}`} strokeWidth={2.5} />
          </button>
          <div className="flex items-center justify-between mb-4 opacity-90 pr-14 relative z-10">
            <span className="text-xs font-semibold uppercase tracking-wider bg-white/20 px-2 py-1 rounded">Orta Seviye</span>
            <span className="text-xs font-bold text-white bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
              Skor: {state.score} / {state.totalQuestions}
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-bold leading-relaxed relative z-10">
            <RenderLatex text={quizData.question} />
          </h3>
        </div>

        {/* Hint Area */}
        {state.hintRevealed && (
          <div className="bg-amber-50 border-b border-amber-100 p-4 px-8 flex items-start gap-3 animate-in slide-in-from-top-2">
            <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5 fill-amber-500" />
            <div>
              <span className="block text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">İpucu</span>
              <p className="text-amber-900 text-sm italic"><RenderLatex text={quizData.hint || "İpucu bulunamadı."} /></p>
            </div>
          </div>
        )}

        {/* Options */}
        <div className="p-6 md:p-8 space-y-3">
          {quizData.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleOptionClick(option)}
              disabled={!!state.selectedOption}
              className={getOptionStyle(option)}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border transition-colors duration-200 ${
                    state.selectedOption 
                      ? (option === quizData.correctAnswer ? 'bg-green-600 border-green-600 text-white' : (state.selectedOption === option ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 text-gray-400'))
                      : 'bg-white border-gray-300 text-gray-500 group-hover:border-azure group-hover:text-azure'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1"><RenderLatex text={option} /></span>
                </span>
                {state.selectedOption && option === quizData.correctAnswer && <CheckCircle2 className="w-6 h-6 text-green-600 animate-success-pop flex-shrink-0" />}
                {state.selectedOption === option && option !== quizData.correctAnswer && <XCircle className="w-6 h-6 text-red-500 animate-error-shake flex-shrink-0" />}
              </div>
            </button>
          ))}
        </div>

        {/* Explanation Footer */}
        {state.selectedOption && (
          <div className="bg-stone-50 border-t border-stone-200 p-6 md:p-8 animate-in slide-in-from-bottom-2">
            <div className="space-y-6">
              {state.selectedOption !== quizData.correctAnswer && getSelectedIndex() !== -1 && (
                <div className="bg-red-50 rounded-xl border border-red-100 p-5 shadow-sm">
                   <h4 className="text-sm font-bold text-red-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <Search className="w-4 h-4 text-red-600" /> Yapay Zeka Hata Analizi
                  </h4>
                  <p className="text-red-900 leading-relaxed text-sm md:text-base">
                    {quizData.optionsExplanations?.[getSelectedIndex()] ? (
                      <RenderLatex text={quizData.optionsExplanations[getSelectedIndex()]} />
                    ) : "Bu seçenek için özel açıklama bulunamadı."}
                  </p>
                </div>
              )}
              <div className={`${state.selectedOption === quizData.correctAnswer ? 'bg-green-50 border-green-100' : 'bg-white border-gray-200'} rounded-xl border p-5 shadow-sm`}>
                <h4 className={`text-sm font-bold uppercase tracking-wide mb-2 flex items-center gap-2 ${state.selectedOption === quizData.correctAnswer ? 'text-green-800' : 'text-gray-900'}`}>
                  {state.selectedOption === quizData.correctAnswer ? <><CheckCircle2 className="w-4 h-4 text-green-600" /> Doğru Cevap</> : <><Brain className="w-4 h-4 text-terracotta" /> Doğru Çözüm</>}
                </h4>
                <p className={`leading-relaxed text-sm md:text-base ${state.selectedOption === quizData.correctAnswer ? 'text-green-900' : 'text-gray-700'}`}>
                  <RenderLatex text={quizData.explanation} />
                </p>
              </div>
            </div>
            <div className="flex justify-end mt-8">
              <button
                onClick={handleNext}
                className="flex items-center gap-2 bg-azure hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-900/10 transition-transform active:scale-95"
              >
                {state.currentQuestionIndex >= state.totalQuestions ? <>Sonuçları Gör <Trophy className="w-5 h-5" /></> : <>Sonraki Soru <ArrowRight className="w-5 h-5" /></>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SummaryView = ({ state, goHome, onRetry }: { state: QuizState, goHome: () => void, onRetry: () => void }) => {
  const rank = getRank(state.score, state.totalQuestions);
  const avgTime = Math.round(state.quizDuration / state.totalQuestions);

  return (
    <div className="animate-in zoom-in-95 duration-500 flex flex-col items-center">
      <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 w-full max-w-lg text-center border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-terracotta via-azure to-emerald-500"></div>
        
        {/* Rank Badge */}
        <div className={`inline-flex items-center justify-center p-6 rounded-full mb-6 ${rank.bg} ${rank.color} ring-8 ring-white shadow-lg`}>
          {React.cloneElement(rank.icon as React.ReactElement<{ className?: string }>, { className: "w-12 h-12" })}
        </div>
        
        <h2 className="text-3xl font-bold text-gray-900 mb-1">Tebrikler!</h2>
        <p className={`text-lg font-medium mb-6 ${rank.color}`}>{rank.title}</p>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
             <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Toplam Skor</div>
             <div className="flex items-center justify-center gap-1 text-2xl font-bold text-gray-800">
                {state.score} <span className="text-sm text-gray-400 font-normal">/ {state.totalQuestions}</span>
             </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
             <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Toplam Süre</div>
             <div className="flex items-center justify-center gap-1 text-2xl font-bold text-gray-800">
                {formatTime(state.quizDuration)}
             </div>
          </div>
          <div className="col-span-2 bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between px-6">
             <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Soru Başına Ort.</div>
             <div className="flex items-center gap-2 text-xl font-bold text-gray-800">
                <Zap className="w-4 h-4 text-amber-500" fill="currentColor" />
                {avgTime} sn
             </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-100 rounded-full h-4 mb-8 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${
              state.score >= 7 ? 'bg-green-500' : state.score >= 4 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${(state.score / state.totalQuestions) * 100}%` }}
          ></div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={goHome} className="px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:border-gray-300 hover:bg-gray-50 transition-colors">Ana Sayfa</button>
          <button onClick={onRetry} className="px-6 py-3 rounded-xl bg-azure text-white font-semibold hover:bg-blue-700 shadow-lg shadow-blue-900/20 transition-transform active:scale-95 flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5" /> Tekrar Çöz ({state.subTopic || state.selectedTopic})
          </button>
        </div>
      </div>
    </div>
  );
};

const ErrorView = ({ msg, goHome, onRetry }: { msg: string, goHome: () => void, onRetry: () => void }) => (
  <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-lg border border-red-100 max-w-md mx-auto text-center animate-in zoom-in-95">
    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4"><AlertCircle className="w-8 h-8 text-red-500" /></div>
    <h3 className="text-lg font-bold text-gray-900 mb-2">Bir Hata Oluştu</h3>
    <p className="text-gray-600 mb-6">{msg}</p>
    <div className="flex gap-3">
      <button onClick={goHome} className="px-6 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Ana Sayfa</button>
      <button onClick={onRetry} className="px-6 py-2 bg-azure text-white rounded-lg hover:bg-blue-700 transition-colors">Tekrar Dene</button>
    </div>
  </div>
);

// --- MAIN COMPONENT ---

const App: React.FC = () => {
  const [state, setState] = useState<QuizState>({
    view: 'TOPIC_SELECTION',
    selectedTopic: null,
    subTopic: null,
    quizData: null,
    questionQueue: [],
    selectedOption: null,
    errorMsg: null,
    currentQuestionIndex: 0,
    totalQuestions: 10,
    score: 0,
    hintsRemaining: 3,
    hintRevealed: false,
    startTime: null,
    quizDuration: 0,
  });

  const isFetchingBackground = useRef(false);

  useEffect(() => {
    const remainingQuestionsNeeded = state.totalQuestions - state.currentQuestionIndex;
    if (
      state.view === 'QUIZ' && 
      state.selectedTopic && 
      state.questionQueue.length < 2 && 
      remainingQuestionsNeeded > state.questionQueue.length &&
      !isFetchingBackground.current
    ) {
      prefetchQuestions(state.selectedTopic, state.subTopic);
    }
  }, [state.view, state.questionQueue.length, state.currentQuestionIndex]);

  const prefetchQuestions = async (topic: Topic, subTopic: string | null) => {
    isFetchingBackground.current = true;
    try {
      const newQuestions = await generateQuizQuestions(topic, subTopic, 3);
      setState(prev => ({ ...prev, questionQueue: [...prev.questionQueue, ...newQuestions] }));
    } catch (error) {
      console.error("Background fetch failed:", error);
    } finally {
      isFetchingBackground.current = false;
    }
  };

  const handleTopicSelect = (topic: Topic) => {
    if (topic === 'Math' || topic === 'Science') {
      setState(prev => ({ ...prev, view: 'SUBTOPIC_SELECTION', selectedTopic: topic, subTopic: null }));
    } else {
      startQuiz(topic, null);
    }
  };

  const startQuiz = async (topic: Topic, subTopic: string | null) => {
    setState(prev => ({ 
      ...prev, view: 'LOADING', selectedTopic: topic, subTopic: subTopic, errorMsg: null,
      currentQuestionIndex: 1, totalQuestions: 10, score: 0, hintsRemaining: 3, hintRevealed: false, quizData: null, questionQueue: [],
      startTime: null, quizDuration: 0
    }));
    
    try {
      const initialBatch = await generateQuizQuestions(topic, subTopic, 3);
      if (initialBatch.length === 0) throw new Error("No questions generated");
      
      // Start the timer when questions are ready
      setState(prev => ({ 
        ...prev, 
        view: 'QUIZ', 
        quizData: initialBatch[0], 
        questionQueue: initialBatch.slice(1), 
        selectedOption: null, 
        hintRevealed: false,
        startTime: Date.now() // TIMER STARTS HERE
      }));
    } catch (error) {
      setState(prev => ({ ...prev, view: 'ERROR', errorMsg: error instanceof Error ? error.message : "Beklenmedik bir hata oluştu." }));
    }
  };

  const handleOptionClick = (option: string) => {
    if (state.selectedOption) return;
    const isCorrect = option === state.quizData?.correctAnswer;
    setState(prev => ({ ...prev, selectedOption: option, score: isCorrect ? prev.score + 1 : prev.score }));
  };

  const handleNext = async () => {
    // Check if we are finishing the quiz
    if (state.currentQuestionIndex >= state.totalQuestions) {
      const endTime = Date.now();
      const duration = Math.floor((endTime - (state.startTime || endTime)) / 1000);
      
      setState(prev => ({ 
        ...prev, 
        view: 'SUMMARY',
        quizDuration: duration 
      }));
      return;
    }

    if (state.questionQueue.length > 0) {
      setState(prev => ({ 
        ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1, quizData: prev.questionQueue[0],
        questionQueue: prev.questionQueue.slice(1), selectedOption: null, hintRevealed: false
      }));
    } else {
      setState(prev => ({ ...prev, view: 'LOADING', currentQuestionIndex: prev.currentQuestionIndex + 1 }));
      try {
        const emergencyBatch = await generateQuizQuestions(state.selectedTopic!, state.subTopic, 2);
        setState(prev => ({ ...prev, view: 'QUIZ', quizData: emergencyBatch[0], questionQueue: emergencyBatch.slice(1), selectedOption: null, hintRevealed: false }));
      } catch (error) {
        setState(prev => ({ ...prev, view: 'ERROR', errorMsg: "Bir sonraki soru yüklenemedi." }));
      }
    }
  };

  const revealHint = () => {
    if (state.hintsRemaining > 0 && !state.hintRevealed) {
      setState(prev => ({ ...prev, hintsRemaining: prev.hintsRemaining - 1, hintRevealed: true }));
    }
  };

  const goHome = () => {
    isFetchingBackground.current = false; 
    setState({
      view: 'TOPIC_SELECTION', selectedTopic: null, subTopic: null, quizData: null, questionQueue: [],
      selectedOption: null, errorMsg: null, currentQuestionIndex: 0, totalQuestions: 10, score: 0, hintsRemaining: 3, hintRevealed: false,
      startTime: null, quizDuration: 0
    });
  };

  return (
    <div className="min-h-screen bg-cream font-sans text-gray-800 flex flex-col items-center py-8 px-4">
      <Header view={state.view} goHome={goHome} />
      <main className="w-full max-w-3xl">
        {state.view === 'TOPIC_SELECTION' && <TopicSelectionView onSelect={handleTopicSelect} />}
        {state.view === 'SUBTOPIC_SELECTION' && state.selectedTopic && <SubTopicView selectedTopic={state.selectedTopic} onStartQuiz={startQuiz} />}
        {state.view === 'LOADING' && <LoadingView state={state} />}
        {state.view === 'QUIZ' && state.quizData && <QuizView state={state} handleOptionClick={handleOptionClick} handleNext={handleNext} revealHint={revealHint} />}
        {state.view === 'SUMMARY' && <SummaryView state={state} goHome={goHome} onRetry={() => state.selectedTopic && startQuiz(state.selectedTopic, state.subTopic)} />}
        {state.view === 'ERROR' && <ErrorView msg={state.errorMsg || "Error"} goHome={goHome} onRetry={() => state.selectedTopic && startQuiz(state.selectedTopic, state.subTopic)} />}
      </main>
    </div>
  );
};

export default App;