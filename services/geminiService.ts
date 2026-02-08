
import { GoogleGenAI, Modality, Type, GenerateContentResponse } from "@google/genai";
import { Accent, Tone, DetailedEvaluation } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper functions for audio processing
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const generateTTS = async (text: string, accent: Accent, tone: Tone, speed: number): Promise<AudioBuffer> => {
  const prompt = `Say with a distinct ${accent} accent and a ${tone} tone. 
  Speaking rate: ${speed}%. 
  Text: ${text}`;
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio returned from Gemini");

  const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  const audioBuffer = await decodeAudioData(
    decode(base64Audio),
    outputAudioContext,
    24000,
    1,
  );

  return audioBuffer;
};

export const evaluatePronunciation = async (originalText: string, audioBlob: Blob): Promise<DetailedEvaluation> => {
  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve) => {
    reader.onloadend = () => {
      const base64data = reader.result as string;
      resolve(base64data.split(',')[1]);
    };
  });
  reader.readAsDataURL(audioBlob);
  const base64Audio = await base64Promise;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-flash-lite-latest',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: audioBlob.type,
            data: base64Audio,
          },
        },
        {
          text: `Evaluate the user's speaking of the following text: "${originalText}". 
          Analyze accuracy, linking, reductions, intonation, fluency, and delivery. 
          
          You MUST respond in JSON format following this schema:
          {
            "overallScore": number (0-100),
            "pronunciation": { "score": number, "advice": "Japanese text" },
            "prosody": { "score": number, "advice": "Japanese text" },
            "fluency": { "score": number, "advice": "Japanese text" },
            "chunking": { "score": number, "advice": "Japanese text" },
            "expressiveness": { "score": number, "advice": "Japanese text" }
          }
          
          Advice should be in Japanese and specific to the user's performance.`
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      // Disabling thinking budget for the fastest possible response time
      thinkingConfig: { thinkingBudget: 0 }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Evaluation parse error:", e);
    throw new Error("Failed to parse evaluation result.");
  }
};

export interface WordIPA {
  word: string;
  ipa: string;
  linksToNext?: boolean;
  linkingType?: string; // e.g. "vowel-to-vowel", "consonant-to-vowel"
  isReduced?: boolean;
}

export const getPhoneticTranscription = async (text: string): Promise<WordIPA[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-flash-lite-latest',
    contents: `Analyze the following English text for natural connected speech features (linking, reductions, elision) as spoken in standard US English.
    For each word, provide:
    1. The word itself.
    2. Its IPA transcription in a natural, connected context.
    3. Whether it links to the next word.
    4. The type of linking.
    5. Whether the word is commonly reduced.
    
    Return as a JSON array.
    Text: "${text}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            ipa: { type: Type.STRING },
            linksToNext: { type: Type.BOOLEAN },
            linkingType: { type: Type.STRING },
            isReduced: { type: Type.BOOLEAN }
          },
          required: ["word", "ipa"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse IPA JSON", e);
    return [];
  }
};
