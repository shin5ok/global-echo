
import React, { useState, useRef, useEffect } from 'react';
import { Accent, Tone, DetailedEvaluation } from './types';
import { generateTTS, evaluatePronunciation, getPhoneticTranscription, WordIPA } from './services/geminiService';
import AudioVisualizer from './components/AudioVisualizer';

const ScoreCard: React.FC<{ title: string; score: number; advice: string; icon: React.ReactNode }> = ({ title, score, advice, icon }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-200 transition-colors">
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-3">
        <div className="bg-slate-50 p-2 rounded-lg text-indigo-600">
          {icon}
        </div>
        <h4 className="font-bold text-slate-700">{title}</h4>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-2xl font-black text-indigo-600">{score}</span>
        <span className="text-[10px] text-slate-400 uppercase font-bold">/ 100</span>
      </div>
    </div>
    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-4">
      <div 
        className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out" 
        style={{ width: `${score}%` }}
      />
    </div>
    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{advice}</p>
  </div>
);

const LegendItem: React.FC<{ color: string; label: string; description: string }> = ({ color, label, description }) => (
  <div className="flex items-center gap-2 group">
    <div className={`w-3 h-3 rounded-full ${color} shadow-sm border border-white/20`} />
    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
    <div className="hidden group-hover:block absolute bg-slate-800 text-white text-[9px] px-2 py-1 rounded -top-8 left-0 whitespace-nowrap z-50">
      {description}
    </div>
  </div>
);

const App: React.FC = () => {
  const [inputText, setInputText] = useState("");
  const [phoneticData, setPhoneticData] = useState<WordIPA[]>([]);
  const [selectedAccent, setSelectedAccent] = useState<Accent>(Accent.USA);
  const [selectedTone, setSelectedTone] = useState<Tone>(Tone.Business);
  const [selectedSpeed, setSelectedSpeed] = useState<number>(50);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [evaluation, setEvaluation] = useState<DetailedEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isFetchingIPA, setIsFetchingIPA] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const speeds = [25, 50, 75, 100, 125, 150];

  const handleStudy = async () => {
    if (!inputText.trim()) {
      setPhoneticData([]);
      return;
    }
    setIsFetchingIPA(true);
    setEvaluation(null);
    try {
      const data = await getPhoneticTranscription(inputText);
      setPhoneticData(data);
    } catch (err) {
      console.error("IPA Fetch Error:", err);
      alert("Failed to analyze text. Please try again.");
    } finally {
      setIsFetchingIPA(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (phoneticData.length > 0) {
      setPhoneticData([]);
    }
  };

  const handlePlayModelAudio = async () => {
    if (!inputText.trim() || phoneticData.length === 0) return;
    setIsGenerating(true);
    try {
      const buffer = await generateTTS(inputText, selectedAccent, selectedTone, selectedSpeed);
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    } catch (error) {
      console.error("TTS Error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleFinishPractice(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setEvaluation(null);
    } catch (error) {
      console.error("Recording error:", error);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFinishPractice = async (blob: Blob) => {
    setIsEvaluating(true);
    try {
      const result = await evaluatePronunciation(inputText, blob);
      setEvaluation(result);
    } catch (error) {
      console.error("Evaluation error:", error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const isStudyRequired = inputText.trim().length > 0 && phoneticData.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="w-full bg-white border-b border-slate-200 py-4 px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Global Echo</h1>
        </div>
        <p className="hidden md:block text-slate-400 font-medium text-sm">AI Accent Training Platform</p>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Sidebar: Control Center */}
        <aside className="w-full lg:w-[380px] bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
          <div className="p-6 space-y-8">
            {/* Input Section */}
            <section>
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Practice Content</label>
                {isFetchingIPA && (
                  <span className="text-[10px] text-indigo-500 animate-pulse font-bold flex items-center gap-1">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ANALYZING...
                  </span>
                )}
              </div>
              <textarea
                className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent outline-none transition-all resize-none text-slate-700 placeholder-slate-400 leading-relaxed text-sm"
                value={inputText}
                onChange={handleInputChange}
                placeholder="Paste text here to begin..."
              />
              <button
                onClick={handleStudy}
                disabled={!inputText.trim() || isFetchingIPA}
                className={`w-full mt-3 py-3 px-4 font-black text-xs uppercase tracking-[0.2em] rounded-xl transition-all flex items-center justify-center gap-2 ${
                  isStudyRequired 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98]' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isFetchingIPA ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9l.707.707M12 18v3m4.657-2.121l.707.707"></path></svg>
                )}
                {isFetchingIPA ? 'Analyzing...' : 'Study'}
              </button>
            </section>

            {/* Config Section */}
            <section className="space-y-6">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Voice Configuration</label>
              
              <div className="space-y-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter block mb-1">Accent Target</span>
                  <select 
                    className="w-full bg-transparent border-none outline-none font-bold text-slate-800 text-sm"
                    value={selectedAccent}
                    onChange={(e) => setSelectedAccent(e.target.value as Accent)}
                  >
                    {Object.values(Accent).map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter block mb-1">Emotional Tone</span>
                  <select 
                    className="w-full bg-transparent border-none outline-none font-bold text-slate-800 text-sm"
                    value={selectedTone}
                    onChange={(e) => setSelectedTone(e.target.value as Tone)}
                  >
                    {Object.values(Tone).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter block mb-1">Speech Pace</span>
                  <select 
                    className="w-full bg-transparent border-none outline-none font-bold text-slate-800 text-sm"
                    value={selectedSpeed}
                    onChange={(e) => setSelectedSpeed(Number(e.target.value))}
                  >
                    {speeds.map(s => <option key={s} value={s}>{s}% {s === 50 ? '(Recommended)' : ''}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* Execution Section */}
            <section className="space-y-4 pt-4 border-t border-slate-100">
              <button
                onClick={handlePlayModelAudio}
                disabled={isGenerating || phoneticData.length === 0}
                className="w-full py-4 px-6 bg-slate-900 text-white font-bold rounded-2xl shadow-lg hover:bg-slate-800 active:scale-[0.98] disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
              >
                {isGenerating ? (
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
                )}
                {isGenerating ? 'GENERATING...' : 'PLAY MODEL VOICE'}
              </button>

              <div className="space-y-3">
                <AudioVisualizer stream={mediaStream} isRecording={isRecording} />
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={isEvaluating || isFetchingIPA || phoneticData.length === 0}
                    className="w-full py-5 bg-rose-500 text-white text-sm font-black rounded-2xl shadow-xl shadow-rose-100 hover:bg-rose-600 active:scale-[0.96] disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em]"
                  >
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse shadow-sm" />
                    PRACTICE
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="w-full py-5 bg-slate-900 text-white text-sm font-black rounded-2xl shadow-xl hover:bg-slate-800 active:scale-[0.96] transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em]"
                  >
                    <div className="w-3 h-3 bg-white rounded-md shadow-sm" />
                    FINISH
                  </button>
                )}
              </div>
            </section>
          </div>
        </aside>

        {/* Main Panel */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-10 flex flex-col items-center">
          <div className="w-full max-w-5xl space-y-10">
            
            {/* Visual Guide */}
            <section className="bg-white p-8 md:p-12 rounded-[32px] shadow-sm border border-slate-200 relative">
              <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                <div className="w-full md:w-1/3 flex justify-start items-center gap-6">
                  <LegendItem color="bg-indigo-500" label="Linking" description="Smooth connection between words" />
                  <LegendItem color="bg-amber-100 border-amber-300" label="Reduced" description="Vowels shortened or changed to Schwa /ə/" />
                </div>
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center flex-1">Practice Sentences</h2>
                <div className="w-full md:w-1/3" />
              </div>
              
              <div className="flex flex-wrap justify-center items-end gap-x-4 gap-y-16 min-h-[120px]">
                {phoneticData.length > 0 ? (
                  phoneticData.map((item, idx) => (
                    <div key={idx} className={`relative flex flex-col items-center group transition-all duration-300`}>
                      {/* Highlighted Word */}
                      <span className={`text-xl md:text-2xl font-bold px-2 py-0.5 rounded-lg transition-all duration-200 ${
                        item.isReduced 
                        ? 'bg-amber-50 text-slate-500 italic border border-amber-100' 
                        : 'text-slate-800'
                      } ${item.linksToNext ? 'border-b-4 border-b-indigo-400/30' : ''} group-hover:text-indigo-600`}>
                        {item.word}
                      </span>

                      {/* IPA Tag */}
                      <span className={`text-[10px] font-mono mt-2.5 px-3 py-1 rounded-full transition-all ${
                        item.isReduced 
                        ? 'bg-slate-100 text-slate-400 border border-slate-200' 
                        : 'bg-indigo-50 text-indigo-600 font-black border border-indigo-100'
                      }`}>
                        /{item.ipa}/
                      </span>

                      {/* Physical Linking Line */}
                      {item.linksToNext && (
                        <div className="absolute -right-5 bottom-0 translate-y-full flex flex-col items-center z-10 pointer-events-none">
                          <svg width="32" height="16" viewBox="0 0 24 12" className="text-indigo-500 drop-shadow-sm">
                             <path d="M2 2C8 10 16 10 22 2" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                          </svg>
                          <span className="text-[7px] font-black uppercase text-indigo-500 tracking-tighter mt-1 opacity-60">LINK</span>
                        </div>
                      )}

                      {/* Visual Marker for Reduction */}
                      {item.isReduced && (
                         <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center">
                           <div className="bg-amber-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-tighter shadow-sm border border-amber-600/10">SCHWA /ə/</div>
                           <div className="w-0.5 h-1.5 bg-amber-400" />
                         </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 w-full">
                    <p className="text-slate-300 italic mb-4">Enter text in the sidebar and click "Study" to generate your practice guide.</p>
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto opacity-50">
                       <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Evaluation Results */}
            <section className="min-h-[400px]">
              {isEvaluating ? (
                <div className="bg-white p-20 rounded-[32px] shadow-sm border border-slate-200 flex flex-col items-center justify-center gap-6 text-slate-400">
                  <div className="relative">
                    <svg className="animate-spin h-16 w-16 text-indigo-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                       <span className="text-[10px] font-black text-indigo-600">AI</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-slate-800 mb-1">Evaluating Performance...</p>
                    <p className="text-sm">Analyzing pronunciation, intonation, and rhythm</p>
                  </div>
                </div>
              ) : evaluation ? (
                <div className="space-y-10">
                  <div className="bg-indigo-600 rounded-[32px] p-10 text-white shadow-2xl shadow-indigo-200 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-2 text-center md:text-left">
                      <h3 className="text-indigo-100 text-[10px] font-black uppercase tracking-[0.4em]">Evaluation Dashboard</h3>
                      <p className="text-3xl font-black">Well done on your practice session!</p>
                      <p className="text-indigo-200 max-w-md">Gemini AI has analyzed your speech patterns. Here is your detailed breakdown.</p>
                    </div>
                    <div className="relative w-40 h-40 shrink-0">
                       <svg className="w-full h-full transform -rotate-90">
                         <circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="none" />
                         <circle 
                            cx="80" cy="80" r="70" 
                            stroke="white" strokeWidth="12" 
                            fill="none" 
                            strokeDasharray={440} 
                            strokeDashoffset={440 - (440 * evaluation.overallScore) / 100}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                         />
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-5xl font-black leading-none">{evaluation.overallScore}</span>
                          <span className="text-[10px] font-bold opacity-70">TOTAL SCORE</span>
                       </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <ScoreCard 
                      title="発音の正確性" 
                      score={evaluation.pronunciation.score} 
                      advice={evaluation.pronunciation.advice}
                      icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path></svg>}
                    />
                    <ScoreCard 
                      title="韻律とイントネーション" 
                      score={evaluation.prosody.score} 
                      advice={evaluation.prosody.advice}
                      icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5z"></path></svg>}
                    />
                    <ScoreCard 
                      title="流暢さ" 
                      score={evaluation.fluency.score} 
                      advice={evaluation.fluency.advice}
                      icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>}
                    />
                    <ScoreCard 
                      title="意味の区切り" 
                      score={evaluation.chunking.score} 
                      advice={evaluation.chunking.advice}
                      icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16"></path></svg>}
                    />
                    <ScoreCard 
                      title="表現力・デリバリー" 
                      score={evaluation.expressiveness.score} 
                      advice={evaluation.expressiveness.advice}
                      icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-slate-100/50 border-2 border-dashed border-slate-200 p-20 rounded-[32px] flex flex-col items-center justify-center text-slate-400 text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                  </div>
                  <p className="text-xl font-bold text-slate-500 mb-2">Ready to evaluate your English</p>
                  <p className="max-w-xs">Record yourself speaking the sentences above to receive a full breakdown of your proficiency.</p>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
