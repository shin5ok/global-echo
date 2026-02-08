
import React, { useState, useRef, useEffect } from 'react';
import { Accent, Tone, DetailedEvaluation } from './types';
import { generateTTS, evaluatePronunciation, getPhoneticTranscription, WordIPA } from './services/geminiService';
import AudioVisualizer from './components/AudioVisualizer';

const ScoreCard: React.FC<{ title: string; score: number; advice: string; icon: React.ReactNode }> = ({ title, score, advice, icon }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
    <div className="flex justify-between items-center mb-2">
      <div className="flex items-center gap-2">
        <div className="text-indigo-600">
          {icon}
        </div>
        <h4 className="font-bold text-slate-700 text-xs">{title}</h4>
      </div>
      <span className="text-sm font-black text-indigo-600">{score}</span>
    </div>
    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mb-2">
      <div 
        className="h-full bg-indigo-500 rounded-full" 
        style={{ width: `${score}%` }}
      />
    </div>
    <p className="text-[10px] text-slate-500 leading-relaxed italic">{advice}</p>
  </div>
);

const LegendItem: React.FC<{ color: string; label: string; description: string }> = ({ color, label, description }) => (
  <div className="flex items-center gap-2 group relative">
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
  const [guideFontSize, setGuideFontSize] = useState<number>(24);
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
      setEvaluation(null);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col h-screen overflow-hidden">
      <header className="w-full bg-white border-b border-slate-200 py-4 px-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Global Echo</h1>
        </div>
        <p className="hidden md:block text-slate-400 font-medium text-sm">AI Accent Training Platform</p>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Sidebar: All Controls and Results */}
        <aside className="w-full lg:w-[380px] xl:w-[420px] bg-white border-r border-slate-200 flex flex-col h-full shrink-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
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
                className="w-full h-28 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent outline-none transition-all resize-none text-slate-700 placeholder-slate-400 leading-relaxed text-sm"
                value={inputText}
                onChange={handleInputChange}
                placeholder="Paste English text here..."
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
                {isFetchingIPA ? 'Analyzing...' : 'Study'}
              </button>
            </section>

            {/* Visual Settings */}
            <section className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Display Options</label>
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] text-slate-400 font-black uppercase">Guide Font Size</span>
                    <span className="text-[10px] font-bold text-indigo-600">{guideFontSize}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="14" 
                    max="48" 
                    value={guideFontSize} 
                    onChange={(e) => setGuideFontSize(Number(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
               </div>
            </section>

            {/* Config Section */}
            <section className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Voice Settings</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[8px] text-slate-400 font-black uppercase tracking-tighter block mb-1">Accent</span>
                  <select 
                    className="w-full bg-transparent border-none outline-none font-bold text-slate-800 text-xs"
                    value={selectedAccent}
                    onChange={(e) => setSelectedAccent(e.target.value as Accent)}
                  >
                    {Object.values(Accent).map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[8px] text-slate-400 font-black uppercase tracking-tighter block mb-1">Tone</span>
                  <select 
                    className="w-full bg-transparent border-none outline-none font-bold text-slate-800 text-xs"
                    value={selectedTone}
                    onChange={(e) => setSelectedTone(e.target.value as Tone)}
                  >
                    {Object.values(Tone).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[8px] text-slate-400 font-black uppercase tracking-tighter block mb-1">Speed</span>
                <select 
                  className="w-full bg-transparent border-none outline-none font-bold text-slate-800 text-xs"
                  value={selectedSpeed}
                  onChange={(e) => setSelectedSpeed(Number(e.target.value))}
                >
                  {speeds.map(s => <option key={s} value={s}>{s}% {s === 50 ? '(Natural)' : ''}</option>)}
                </select>
              </div>
            </section>

            {/* Execution Controls */}
            <section className="space-y-4 pt-4 border-t border-slate-100">
              <button
                onClick={handlePlayModelAudio}
                disabled={isGenerating || phoneticData.length === 0}
                className="w-full py-3 px-6 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 active:scale-[0.98] disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"
              >
                {isGenerating ? 'GENERATING...' : 'LISTEN TO MODEL'}
              </button>

              <div className="space-y-3">
                <AudioVisualizer stream={mediaStream} isRecording={isRecording} />
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={isEvaluating || isFetchingIPA || phoneticData.length === 0}
                    className="w-full py-4 bg-rose-500 text-white text-xs font-black rounded-xl shadow-xl shadow-rose-100 hover:bg-rose-600 active:scale-[0.96] disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em]"
                  >
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-sm" />
                    PRACTICE
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="w-full py-4 bg-slate-900 text-white text-xs font-black rounded-xl shadow-xl hover:bg-slate-800 active:scale-[0.96] transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em]"
                  >
                    <div className="w-2 h-2 bg-white rounded-md shadow-sm" />
                    FINISH
                  </button>
                )}
              </div>
            </section>

            {/* Evaluation Section in Sidebar */}
            <section className="pt-4 border-t border-slate-100">
              {isEvaluating ? (
                <div className="flex flex-col items-center justify-center py-10 gap-4 text-slate-400">
                  <svg className="animate-spin h-8 w-8 text-indigo-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <p className="text-xs font-bold text-slate-600">AI分析中...</p>
                </div>
              ) : evaluation ? (
                <div className="space-y-6">
                  <div className="bg-indigo-600 rounded-2xl p-5 text-white shadow-xl flex items-center gap-4">
                    <div className="relative w-16 h-16 shrink-0">
                       <svg className="w-full h-full transform -rotate-90">
                         <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.1)" strokeWidth="4" fill="none" />
                         <circle 
                            cx="32" cy="32" r="28" 
                            stroke="white" strokeWidth="4" 
                            fill="none" 
                            strokeDasharray={176} 
                            strokeDashoffset={176 - (176 * evaluation.overallScore) / 100}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                         />
                       </svg>
                       <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xl font-black">{evaluation.overallScore}</span>
                       </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-1">Assessment</h3>
                      <p className="text-[10px] leading-relaxed font-medium">{evaluation.overallAdvice}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <ScoreCard 
                      title="発音" score={evaluation.pronunciation.score} advice={evaluation.pronunciation.advice}
                      icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10"></path></svg>}
                    />
                    <ScoreCard 
                      title="イントネーション" score={evaluation.prosody.score} advice={evaluation.prosody.advice}
                      icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path></svg>}
                    />
                    <ScoreCard 
                      title="流暢さ" score={evaluation.fluency.score} advice={evaluation.fluency.advice}
                      icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>}
                    />
                    <ScoreCard 
                      title="区切り" score={evaluation.chunking.score} advice={evaluation.chunking.advice}
                      icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16"></path></svg>}
                    />
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </aside>

        {/* Main Panel: Wide Visual Guide */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8 flex flex-col items-center custom-scrollbar">
          <div className="w-full max-w-none space-y-8">
            
            <section className="bg-white p-8 md:p-12 lg:p-16 rounded-[40px] shadow-sm border border-slate-200 relative">
              <div className="flex flex-col lg:flex-row justify-between items-center mb-16 gap-6">
                <div className="w-full lg:w-1/3 flex justify-start items-center gap-8">
                  <LegendItem color="bg-indigo-500" label="Linking" description="Smooth connection between words" />
                  <LegendItem color="bg-amber-100 border-amber-300" label="Reduced" description="Vowels shortened or changed to Schwa /ə/" />
                </div>
                <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] text-center flex-1">Phonetic Visual Guide</h2>
                <div className="hidden lg:block lg:w-1/3" />
              </div>
              
              <div 
                className="flex flex-wrap justify-center items-end gap-x-8 gap-y-24 min-h-[300px]"
              >
                {phoneticData.length > 0 ? (
                  phoneticData.map((item, idx) => (
                    <div key={idx} className="relative flex flex-col items-center group">
                      {/* Main Word Display */}
                      <span 
                        style={{ fontSize: `${guideFontSize}px` }}
                        className={`font-bold px-3 py-1 rounded-xl transition-all duration-300 ${
                          item.isReduced 
                          ? 'bg-amber-50 text-slate-500 italic border border-amber-100' 
                          : 'text-slate-800'
                        } ${item.linksToNext ? 'border-b-[6px] border-b-indigo-400/20' : ''} group-hover:text-indigo-600 whitespace-nowrap`}
                      >
                        {item.word}
                      </span>

                      {/* IPA Tag */}
                      <span className={`text-[10px] md:text-xs font-mono mt-4 px-4 py-1.5 rounded-full shadow-sm transition-all ${
                        item.isReduced 
                        ? 'bg-slate-50 text-slate-400 border border-slate-200' 
                        : 'bg-indigo-50 text-indigo-600 font-black border border-indigo-100'
                      }`}>
                        /{item.ipa}/
                      </span>

                      {/* Linking Visualizer */}
                      {item.linksToNext && (
                        <div className="absolute -right-8 bottom-0 translate-y-full flex flex-col items-center z-10 pointer-events-none">
                          <svg width="48" height="24" viewBox="0 0 24 12" className="text-indigo-500 drop-shadow-md">
                             <path d="M2 2C8 10 16 10 22 2" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                          </svg>
                          <span className="text-[7px] font-black uppercase text-indigo-500 tracking-tighter mt-1 opacity-70">LINK</span>
                        </div>
                      )}

                      {/* Reduction Visualizer */}
                      {item.isReduced && (
                         <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce-slow">
                           <div className="bg-amber-500 text-white text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-tighter shadow-md border border-amber-600/10 whitespace-nowrap">SCHWA /ə/</div>
                           <div className="w-0.5 h-3 bg-amber-400" />
                         </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 w-full opacity-40">
                    <div className="w-24 h-24 bg-slate-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6 transform rotate-12">
                       <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                    </div>
                    <p className="text-xl font-bold text-slate-400">Please study text to start</p>
                  </div>
                )}
              </div>
            </section>

          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
