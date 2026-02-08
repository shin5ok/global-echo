
import React, { useState, useRef, useEffect } from 'react';
import { Accent, Tone } from './types';
import { generateTTS, evaluatePronunciation, getPhoneticTranscription, WordIPA } from './services/geminiService';
import AudioVisualizer from './components/AudioVisualizer';

const App: React.FC = () => {
  const [inputText, setInputText] = useState("Hello, I'm learning to speak English with different accents.");
  const [phoneticData, setPhoneticData] = useState<WordIPA[]>([]);
  const [selectedAccent, setSelectedAccent] = useState<Accent>(Accent.USA);
  const [selectedTone, setSelectedTone] = useState<Tone>(Tone.Business);
  const [selectedSpeed, setSelectedSpeed] = useState<number>(50);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isFetchingIPA, setIsFetchingIPA] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<number | null>(null);

  const speeds = [25, 50, 75, 100, 125, 150];

  const fetchIPA = async (text: string) => {
    if (!text.trim()) {
      setPhoneticData([]);
      return;
    }
    setIsFetchingIPA(true);
    try {
      const data = await getPhoneticTranscription(text);
      setPhoneticData(data);
    } catch (err) {
      console.error("IPA Fetch Error:", err);
    } finally {
      setIsFetchingIPA(false);
    }
  };

  useEffect(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      fetchIPA(inputText);
    }, 1000);
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [inputText]);

  const handlePlayModelAudio = async () => {
    if (!inputText.trim()) return;
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
      alert("Error generating audio. Please try again.");
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
      setFeedback(null);
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
      setFeedback(result);
    } catch (error) {
      console.error("Evaluation error:", error);
      setFeedback("評価中にエラーが発生しました。");
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="w-full bg-white border-b border-slate-200 py-4 px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Global Echo</h1>
        </div>
        <p className="hidden md:block text-slate-500 font-medium">Master any accent with AI guidance</p>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Sidebar: Setup & Configuration */}
        <aside className="w-full lg:w-[400px] bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
          <div className="p-6 space-y-8">
            <section>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Setup Practice Text</label>
                {isFetchingIPA && (
                  <span className="text-xs text-indigo-500 animate-pulse flex items-center gap-1 font-medium">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Syncing...
                  </span>
                )}
              </div>
              <textarea
                className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent outline-none transition-all resize-none text-slate-700 placeholder-slate-400 leading-relaxed"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter text to practice..."
              />
            </section>

            <section className="space-y-4">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider block">Voice Settings</label>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-slate-600 mb-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h2.945M8 3.935A9 9 0 0116.5 20.065"></path></svg>
                    <span className="text-xs font-semibold uppercase">Accent</span>
                  </div>
                  <select 
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    value={selectedAccent}
                    onChange={(e) => setSelectedAccent(e.target.value as Accent)}
                  >
                    {Object.values(Accent).map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-slate-600 mb-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span className="text-xs font-semibold uppercase">Tone</span>
                  </div>
                  <select 
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    value={selectedTone}
                    onChange={(e) => setSelectedTone(e.target.value as Tone)}
                  >
                    {Object.values(Tone).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-slate-600 mb-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span className="text-xs font-semibold uppercase">Speed</span>
                  </div>
                  <select 
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    value={selectedSpeed}
                    onChange={(e) => setSelectedSpeed(Number(e.target.value))}
                  >
                    {speeds.map(s => (
                      <option key={s} value={s}>
                        {s}% {s === 50 ? '(Normal)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <button
              onClick={handlePlayModelAudio}
              disabled={isGenerating || !inputText.trim() || isFetchingIPA}
              className="w-full py-4 px-6 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              )}
              Play Model Audio
            </button>
          </div>
        </aside>

        {/* Right Main Stage: Practice Performance */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-8 flex flex-col items-center">
          <div className="w-full max-w-4xl space-y-8">
            {/* Stage: Large Readable Text with IPA */}
            <section className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-8 text-center">Practice Sentences</h2>
              
              <div className="flex flex-wrap justify-center items-end gap-x-2 gap-y-12">
                {phoneticData.length > 0 ? (
                  phoneticData.map((item, idx) => (
                    <div key={idx} className="relative flex flex-col items-center group mb-2">
                      {/* Word Display */}
                      <span className={`text-xl md:text-2xl font-semibold transition-colors duration-200 ${item.isReduced ? 'text-slate-400 italic' : 'text-slate-800'} group-hover:text-indigo-600`}>
                        {item.word}
                      </span>
                      
                      {/* IPA Display */}
                      <span className={`text-xs font-mono mt-1.5 px-2 py-0.5 rounded-full transition-all ${item.isReduced ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-500'}`}>
                        /{item.ipa}/
                      </span>

                      {/* Linking Indicator (Curve) */}
                      {item.linksToNext && (
                        <div className="absolute -right-3 bottom-0 translate-y-full flex flex-col items-center z-0">
                          <svg width="24" height="12" viewBox="0 0 24 12" className="text-indigo-300">
                             <path d="M2 2C8 10 16 10 22 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                          <span className="text-[8px] font-bold uppercase tracking-tighter text-indigo-400 whitespace-nowrap -mt-1">
                            {item.linkingType?.includes('consonant') ? 'link' : 'liaison'}
                          </span>
                        </div>
                      )}

                      {/* Reduction Label */}
                      {item.isReduced && (
                         <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                           <span className="text-[8px] font-bold bg-slate-200 text-slate-500 px-1 rounded uppercase tracking-tighter">Reduced</span>
                         </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="w-full text-center py-6">
                    <p className="text-slate-400 text-lg italic">Enter text in the sidebar to begin...</p>
                  </div>
                )}
              </div>
            </section>

            {/* Stage: Recording Controls */}
            <section className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1 w-full bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <AudioVisualizer stream={mediaStream} isRecording={isRecording} />
              </div>

              <div className="w-full md:w-56">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={isEvaluating || isFetchingIPA}
                    className="w-full py-5 px-6 bg-rose-500 text-white text-lg font-black rounded-2xl shadow-xl shadow-rose-100 hover:bg-rose-600 active:scale-[0.96] disabled:bg-slate-300 disabled:shadow-none disabled:cursor-wait transition-all flex items-center justify-center gap-3 uppercase tracking-wider"
                  >
                    {isFetchingIPA ? (
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                    )}
                    {isFetchingIPA ? 'Wait...' : 'Practice'}
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="w-full py-5 px-6 bg-slate-900 text-white text-lg font-black rounded-2xl shadow-xl hover:bg-slate-800 active:scale-[0.96] transition-all flex items-center justify-center gap-3 uppercase tracking-wider"
                  >
                    <div className="w-3 h-3 bg-white rounded-sm" />
                    Finish
                  </button>
                )}
              </div>
            </section>

            {/* Stage: Feedback Result */}
            <section className="min-h-[200px]">
              {isEvaluating ? (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center gap-4 text-slate-400 italic">
                  <svg className="animate-spin h-8 w-8 text-indigo-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <p>AI is evaluating your linking and intonation...</p>
                </div>
              ) : feedback ? (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-indigo-500">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-indigo-100 p-2 rounded-lg">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Practice Analysis</h3>
                  </div>
                  <div className="prose prose-indigo max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed text-base">
                    {feedback}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-100/50 border-2 border-dashed border-slate-200 p-8 rounded-2xl flex flex-col items-center justify-center text-slate-400 text-center">
                  <p className="font-medium">Your detailed pronunciation breakdown will appear here after practicing.</p>
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
