import { GoogleGenAI, Type, Modality } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Simple in-memory cache to minimize API requests
const apiCache = new Map<string, any>();
const pendingRequests = new Map<string, Promise<any>>();

const getHistory = (key: string): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(`history_${key}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const addToHistory = (key: string, items: string[]) => {
  if (typeof window === 'undefined') return;
  try {
    const history = getHistory(key);
    const newHistory = [...new Set([...history, ...items])].slice(-50); // Keep last 50
    localStorage.setItem(`history_${key}`, JSON.stringify(newHistory));
  } catch {}
};

const fetchWithCache = async <T>(key: string, fetcher: () => Promise<T>, forceRefresh: boolean = false): Promise<T> => {
  if (!forceRefresh && apiCache.has(key)) {
    return apiCache.get(key);
  }
  
  if (!forceRefresh && pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const promise = fetcher().then(result => {
    apiCache.set(key, result);
    pendingRequests.delete(key);
    return result;
  }).catch(err => {
    pendingRequests.delete(key);
    throw err;
  });

  pendingRequests.set(key, promise);
  return promise;
};

export const getUsefulIdioms = async (forceRefresh: boolean = false) => {
  return fetchWithCache('idioms', async () => {
    const history = getHistory('idioms');
    const historyPrompt = history.length > 0 ? `\n\nDo NOT include any of these idioms you have already generated: ${history.join(', ')}.` : '';

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a list of 5 random, highly useful English idioms for an intermediate learner. Do not use the most common ones (like "piece of cake" or "break a leg"). Ensure variety. Random seed: ${Math.random()}.${historyPrompt} Return JSON with an array of objects, each containing "idiom", "meaning", and "examples" (an array of 3 distinct example sentences).`,
      config: {
        temperature: 1.5,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              idiom: { type: Type.STRING },
              meaning: { type: Type.STRING },
              examples: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
            },
            required: ['idiom', 'meaning', 'examples'],
          }
        },
      },
    });
    const data = JSON.parse(response.text || '[]');
    addToHistory('idioms', data.map((item: any) => item.idiom));
    return data;
  }, forceRefresh);
};

export const transcribeAudio = async (base64Audio: string, mimeType: string) => {
  // Audio transcription is usually unique, so we don't cache it here
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        inlineData: {
          data: base64Audio,
          mimeType,
        },
      },
      { text: 'Transcribe this audio accurately. Only return the transcription. Do not add any extra text.' },
    ],
  });
  return response.text;
};

export const checkGrammar = async (text: string, forceRefresh: boolean = false) => {
  return fetchWithCache(`grammar_check_${text}`, async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze the following text for grammar mistakes. If there are mistakes, explain them simply and provide the corrected version. If it's correct, say so. Text: "${text}"`,
    });
    return response.text;
  }, forceRefresh);
};

export const createChatSession = (systemInstruction: string) => {
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction,
    },
  });
};

export const getUsefulSentences = async (forceRefresh: boolean = false) => {
  return fetchWithCache('sentences', async () => {
    const history = getHistory('sentences');
    const historyPrompt = history.length > 0 ? `\n\nDo NOT include any of these sentences you have already generated: ${history.join(' | ')}.` : '';

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a list of 5 random, highly useful English sentences for everyday conversation for an intermediate learner. Focus on different everyday scenarios. Ensure variety. Random seed: ${Math.random()}.${historyPrompt} Return JSON with an array of objects, each containing "sentence", "context" (when to use it), and "meaning".`,
      config: {
        temperature: 1.5,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sentence: { type: Type.STRING },
              context: { type: Type.STRING },
              meaning: { type: Type.STRING },
            },
            required: ['sentence', 'context', 'meaning'],
          }
        },
      },
    });
    const data = JSON.parse(response.text || '[]');
    addToHistory('sentences', data.map((item: any) => item.sentence));
    return data;
  }, forceRefresh);
};

export const getUsefulGrammar = async (forceRefresh: boolean = false) => {
  return fetchWithCache('grammar_topics', async () => {
    const history = getHistory('grammar');
    const historyPrompt = history.length > 0 ? `\n\nDo NOT include any of these grammar rules/topics you have already generated: ${history.join(', ')}.` : '';

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a list of 8 random, useful English grammar rules or topics for an intermediate learner. Pick a diverse mix of tenses, prepositions, conditionals, etc. Ensure variety. Random seed: ${Math.random()}.${historyPrompt} Return JSON with an array of objects, each containing "rule" (the name of the rule/topic) and "shortDescription" (a very brief 1-sentence summary).`,
      config: {
        temperature: 1.5,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              rule: { type: Type.STRING },
              shortDescription: { type: Type.STRING },
            },
            required: ['rule', 'shortDescription'],
          }
        },
      },
    });
    const data = JSON.parse(response.text || '[]');
    addToHistory('grammar', data.map((item: any) => item.rule));
    return data;
  }, forceRefresh);
};

export const getGrammarDetails = async (topic: string, forceRefresh: boolean = false) => {
  return fetchWithCache(`grammar_details_${topic}`, async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a comprehensive study guide and quiz for the English grammar topic: "${topic}". 
Return JSON with the following structure:
- "explanation": A detailed, easy-to-understand explanation of the rule.
- "examples": An array of 5 distinct example sentences demonstrating the rule.
- "quiz": An array of 5 multiple-choice questions to test the user's understanding of this specific rule. Each question should have "question", "options" (array of 4 strings), "answer" (the correct option string), and "explanation" (why this answer is correct).`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING },
            examples: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            quiz: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  answer: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ['question', 'options', 'answer', 'explanation']
              }
            }
          },
          required: ['explanation', 'examples', 'quiz']
        }
      }
    });
    return JSON.parse(response.text || '{}');
  }, forceRefresh);
};

export const getNewRoleplays = async (forceRefresh: boolean = false) => {
  return fetchWithCache('roleplays', async () => {
    const history = getHistory('roleplays');
    const historyPrompt = history.length > 0 ? `\n\nDo NOT include any of these scenarios you have already generated: ${history.join(', ')}.` : '';

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a list of 3 unique, random everyday English roleplay scenarios for an intermediate learner. Ensure variety. Random seed: ${Math.random()}.${historyPrompt} Return JSON with an array of objects, each containing "title" (short name), "emoji" (a fitting emoji), and "category" (e.g., "Travel", "Professional", "Everyday Life", "Socializing").`,
      config: {
        temperature: 1.5,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              emoji: { type: Type.STRING },
              category: { type: Type.STRING },
            },
            required: ['title', 'emoji', 'category'],
          }
        },
      },
    });
    const data = JSON.parse(response.text || '[]');
    addToHistory('roleplays', data.map((item: any) => item.title));
    return data;
  }, forceRefresh);
};

export const getSuggestedResponses = async (tutorMessage: string, scenario: string, forceRefresh: boolean = false) => {
  return fetchWithCache(`suggestions_${scenario}_${tutorMessage}`, async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an English tutor. The user is in a roleplay scenario: "${scenario}".
The tutor just said: "${tutorMessage}"
Provide 3 good, natural, and slightly varied English responses the user could say next. Keep them relatively short (1-2 sentences).
Return JSON with an array of strings.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
    });
    return JSON.parse(response.text || '[]');
  }, forceRefresh);
};

export const generateSpeech = async (text: string, forceRefresh: boolean = false) => {
  return fetchWithCache(`speech_${text}`, async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  }, forceRefresh);
};
