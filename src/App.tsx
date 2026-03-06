import React, { useState, useEffect, useRef } from 'react';
import { transcribeAudio, checkGrammar, createChatSession, getNewRoleplays, getSuggestedResponses, generateSpeech } from './lib/gemini';
import { STTRecorder, playTTSAudio } from './lib/audioUtils';
import { Mic, Send, CheckCircle, Square, Briefcase, Coffee, Stethoscope, Loader2, Sparkles, Plane, Hotel, Users, MapPin, BookOpen, RefreshCw, ChevronDown, ChevronRight, Sun, Moon, Monitor, MessageSquareX, Lightbulb, Volume2, MessageSquare } from 'lucide-react';
import Markdown from 'react-markdown';
import StudyHub from './components/StudyHub';
import { useTheme } from './hooks/useTheme';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  isCorrecting?: boolean;
  correction?: string;
}

interface Roleplay {
  title: string;
  emoji: string;
  category: string;
}

const INITIAL_ROLEPLAYS: Roleplay[] = [
  { title: 'Job Interview', emoji: '💼', category: 'Professional' },
  { title: 'Ordering Coffee', emoji: '☕', category: 'Everyday Life' },
  { title: 'Doctor\'s Visit', emoji: '🩺', category: 'Everyday Life' },
  { title: 'At the Airport', emoji: '✈️', category: 'Travel' },
  { title: 'Hotel Check-in', emoji: '🏨', category: 'Travel' },
  { title: 'Meeting New Friends', emoji: '👋', category: 'Socializing' },
  { title: 'Asking for Directions', emoji: '🗺️', category: 'Travel' },
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentMode, setCurrentMode] = useState<string>('General Chat');
  const [activeView, setActiveView] = useState<'chat' | 'study'>('chat');
  const [dynamicRoleplays, setDynamicRoleplays] = useState<Roleplay[]>([]);
  const [isGeneratingRoleplays, setIsGeneratingRoleplays] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Everyday Life': true,
    'Professional': true,
    'Travel': false,
    'Socializing': false
  });
  const [suggestedResponses, setSuggestedResponses] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  
  const { theme, setTheme } = useTheme();
  
  const chatRef = useRef<any>(null);
  const sttRecorderRef = useRef<STTRecorder | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const resetChat = () => {
    const systemInstruction = "You are a patient, encouraging English tutor. Respond naturally to keep the conversation going. If I make a grammar mistake, highlight it in bold and explain why it was wrong in simple terms. Suggest one 'Level Up' word in every response (a more advanced synonym for a word I used). Keep your language level at B2 (Upper Intermediate) unless I ask to go higher.";
    chatRef.current = createChatSession(systemInstruction);
    setCurrentMode('General Chat');
    setSuggestedResponses([]);
    setMessages([{
      id: Date.now().toString(),
      role: 'model',
      text: "Hello! I'm your English tutor. How can I help you practice today? We can chat here, or you can try a Live Roleplay from the menu!"
    }]);
  };

  const handlePlayAudio = async (id: string, text: string) => {
    if (playingId) return;
    setPlayingId(id);
    try {
      const audioBase64 = await generateSpeech(text);
      if (audioBase64) {
        await playTTSAudio(audioBase64);
      }
    } catch (e) {
      console.error("TTS Error:", e);
    } finally {
      setPlayingId(null);
    }
  };

  useEffect(() => {
    resetChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // Generate suggested responses if in roleplay mode and last message is from model
    const generateSuggestions = async () => {
      if (messages.length === 0) return;
      const lastMessage = messages[messages.length - 1];
      
      if (currentMode.startsWith('Roleplay: ') && lastMessage.role === 'model') {
        const scenario = currentMode.replace('Roleplay: ', '');
        setIsGeneratingSuggestions(true);
        setSuggestedResponses([]);
        try {
          const suggestions = await getSuggestedResponses(lastMessage.text, scenario);
          setSuggestedResponses(suggestions);
        } catch (error) {
          console.error("Failed to generate suggestions:", error);
        } finally {
          setIsGeneratingSuggestions(false);
        }
      } else {
        setSuggestedResponses([]);
      }
    };

    generateSuggestions();
  }, [messages, currentMode]);

  const handleRefreshSuggestions = async () => {
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    
    if (currentMode.startsWith('Roleplay: ') && lastMessage.role === 'model') {
      const scenario = currentMode.replace('Roleplay: ', '');
      setIsGeneratingSuggestions(true);
      try {
        const suggestions = await getSuggestedResponses(lastMessage.text, scenario, true);
        setSuggestedResponses(suggestions);
      } catch (error) {
        console.error("Failed to generate suggestions:", error);
      } finally {
        setIsGeneratingSuggestions(false);
      }
    }
  };

  const handleSend = async (text: string = input) => {
    if (!text.trim() || !chatRef.current) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await chatRef.current.sendMessage({ message: text });
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: response.text
      }]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      if (sttRecorderRef.current) {
        const { base64, mimeType } = await sttRecorderRef.current.stop();
        if (base64) {
          setIsTyping(true);
          try {
            const transcription = await transcribeAudio(base64, mimeType);
            setInput(transcription.trim());
          } catch (err) {
            console.error("Transcription error:", err);
          } finally {
            setIsTyping(false);
          }
        }
      }
    } else {
      sttRecorderRef.current = new STTRecorder();
      await sttRecorderRef.current.start();
      setIsRecording(true);
    }
  };

  const handleCorrectMe = async (msgId: string, text: string) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isCorrecting: true } : m));
    try {
      const correction = await checkGrammar(text);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isCorrecting: false, correction } : m));
    } catch (err) {
      console.error("Correction error:", err);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isCorrecting: false } : m));
    }
  };

  const startRoleplay = async (scenario: string) => {
    const systemInstruction = `You are a patient, encouraging English tutor. We are doing a roleplay: ${scenario}. You start the conversation. Respond naturally to keep the conversation going. If I make a grammar mistake, highlight it in bold and explain why it was wrong in simple terms. Suggest one 'Level Up' word in every response (a more advanced synonym for a word I used). Keep your language level at B2 (Upper Intermediate) unless I ask to go higher.`;
    
    chatRef.current = createChatSession(systemInstruction);
    setCurrentMode(`Roleplay: ${scenario}`);
    setSuggestedResponses([]);
    setMessages([]);
    setIsTyping(true);
    
    try {
      const response = await chatRef.current.sendMessage({ message: "Let's start the roleplay. You go first." });
      setMessages([{
        id: Date.now().toString(),
        role: 'model',
        text: response.text
      }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages([{
        id: Date.now().toString(),
        role: 'model',
        text: "Sorry, I couldn't start the roleplay right now. Please try again."
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleGenerateRoleplays = async () => {
    setIsGeneratingRoleplays(true);
    try {
      const newRoleplays = await getNewRoleplays(true);
      setDynamicRoleplays(prev => [...prev, ...newRoleplays]);
      
      // Auto-expand newly generated categories
      const newCategories = newRoleplays.map((rp: Roleplay) => rp.category);
      setExpandedCategories(prev => {
        const next = { ...prev };
        newCategories.forEach((cat: string) => { next[cat] = true; });
        return next;
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingRoleplays(false);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const allRoleplays = [...INITIAL_ROLEPLAYS, ...dynamicRoleplays];
  const groupedRoleplays = allRoleplays.reduce((acc, rp) => {
    if (!acc[rp.category]) acc[rp.category] = [];
    acc[rp.category].push(rp);
    return acc;
  }, {} as Record<string, Roleplay[]>);

  return (
    <div className="min-h-screen bg-[#f5f5f0] dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-200 flex flex-col md:flex-row overflow-hidden transition-colors duration-200">
      {/* Sidebar */}
      <div className="w-full md:w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-6 flex flex-col overflow-y-auto h-screen custom-scrollbar transition-colors duration-200">
        <div className="flex items-center space-x-3 mb-8 shrink-0">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">LingoTutor</h1>
        </div>

        <div className="mb-8 shrink-0 space-y-3">
          <button 
            onClick={() => setActiveView('chat')}
            className={`w-full ${activeView === 'chat' ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'} border rounded-xl p-4 flex items-center justify-between transition-colors shadow-sm`}
          >
            <div className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-3" />
              <div className="text-left">
                <h3 className="font-bold text-sm">Live Tutor</h3>
                <p className="text-xs opacity-80">Practice speaking</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => setActiveView('study')}
            className={`w-full ${activeView === 'study' ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'} border rounded-xl p-4 flex items-center justify-between transition-colors shadow-sm`}
          >
            <div className="flex items-center">
              <BookOpen className="w-5 h-5 mr-3" />
              <div className="text-left">
                <h3 className="font-bold text-sm">Study Hub</h3>
                <p className="text-xs opacity-80">Grammar, Idioms & Quizzes</p>
              </div>
            </div>
            <div className="bg-white dark:bg-indigo-900/50 p-1.5 rounded-lg shadow-sm">
              <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            </div>
          </button>
        </div>

        <div className="shrink-0 pb-6">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Live Roleplay</h3>
          <div className="space-y-3">
            {Object.entries(groupedRoleplays).map(([category, roleplays]) => (
              <div key={category} className="mb-2">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between p-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <span>{category}</span>
                  {expandedCategories[category] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {expandedCategories[category] && (
                  <div className="mt-1 space-y-2 pl-1 animate-in slide-in-from-top-2 duration-200">
                    {roleplays.map((rp, idx) => (
                      <button key={`${category}-${idx}`} onClick={() => startRoleplay(rp.title)} className="w-full flex items-center space-x-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700 transition-colors text-left shadow-sm bg-white dark:bg-gray-800">
                        <div className="bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 p-1.5 rounded-lg w-8 h-8 flex items-center justify-center text-base shrink-0">{rp.emoji}</div>
                        <span className="font-medium text-gray-700 dark:text-gray-200 text-sm">{rp.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <button 
              onClick={handleGenerateRoleplays} 
              disabled={isGeneratingRoleplays}
              className="w-full flex items-center justify-center space-x-2 p-3 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors disabled:opacity-50 mt-4"
            >
              <RefreshCw className={`w-4 h-4 ${isGeneratingRoleplays ? 'animate-spin' : ''}`} />
              <span className="font-medium text-sm">Generate New Scenarios</span>
            </button>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
            <button onClick={() => setTheme('light')} className={`p-2 rounded-md flex-1 flex justify-center transition-colors ${theme === 'light' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}><Sun className="w-4 h-4" /></button>
            <button onClick={() => setTheme('system')} className={`p-2 rounded-md flex-1 flex justify-center transition-colors ${theme === 'system' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}><Monitor className="w-4 h-4" /></button>
            <button onClick={() => setTheme('dark')} className={`p-2 rounded-md flex-1 flex justify-center transition-colors ${theme === 'dark' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}><Moon className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen max-h-screen relative">
        <div className={activeView === 'study' ? 'flex-1 flex flex-col h-full' : 'hidden'}>
          <StudyHub />
        </div>
        <div className={activeView === 'chat' ? 'flex-1 flex flex-col h-full' : 'hidden'}>
          {/* Header Bar */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${currentMode === 'General Chat' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
            <span className="font-medium text-gray-700 dark:text-gray-200">{currentMode}</span>
          </div>
          {currentMode !== 'General Chat' && (
            <button 
              onClick={resetChat}
              className="flex items-center space-x-1 text-sm text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors bg-gray-100 hover:bg-red-50 dark:bg-gray-700 dark:hover:bg-red-900/30 px-3 py-1.5 rounded-lg"
            >
              <MessageSquareX className="w-4 h-4" />
              <span>End Roleplay</span>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm shadow-sm'}`}>
                <div className="prose prose-sm max-w-none">
                  {msg.role === 'model' ? (
                    <Markdown>{msg.text}</Markdown>
                  ) : (
                    <p>{msg.text}</p>
                  )}
                </div>
                
                {msg.role === 'model' && (
                  <div className="mt-3 flex justify-start">
                    <button
                      onClick={() => handlePlayAudio(msg.id, msg.text)}
                      disabled={playingId === msg.id}
                      className="flex items-center space-x-1 text-xs text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors disabled:opacity-50"
                    >
                      {playingId === msg.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
                      <span>{playingId === msg.id ? 'Playing...' : 'Play Audio'}</span>
                    </button>
                  </div>
                )}
                
                {msg.role === 'user' && (
                  <div className="mt-3 flex justify-end">
                    <button 
                      onClick={() => handleCorrectMe(msg.id, msg.text)}
                      disabled={msg.isCorrecting || !!msg.correction}
                      className="flex items-center space-x-1 text-xs bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                    >
                      {msg.isCorrecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                      <span>{msg.correction ? 'Corrected' : 'Correct Me'}</span>
                    </button>
                  </div>
                )}

                {msg.correction && (
                  <div className="mt-3 bg-white/10 p-3 rounded-lg text-sm border border-white/20">
                    <div className="font-semibold mb-1 flex items-center"><Sparkles className="w-3 h-3 mr-1" /> Tutor's Note:</div>
                    <Markdown>{msg.correction}</Markdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm p-4 shadow-sm flex space-x-2">
                <div className="w-2 h-2 bg-gray-300 dark:bg-gray-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-300 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-gray-300 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 transition-colors duration-200 flex flex-col">
          {/* Suggested Responses */}
          {(suggestedResponses.length > 0 || isGeneratingSuggestions) && (
            <div className="max-w-4xl mx-auto w-full mb-3 flex flex-wrap gap-2 items-center">
              {isGeneratingSuggestions ? (
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-1.5 px-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Thinking of ideas...</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center text-xs font-medium text-amber-600 dark:text-amber-500 mr-1">
                    <Lightbulb className="w-3.5 h-3.5 mr-1" />
                    <span>Ideas:</span>
                  </div>
                  {suggestedResponses.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(suggestion)}
                      className="text-xs bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 px-3 py-1.5 rounded-full transition-colors text-left max-w-xs truncate"
                      title={suggestion}
                    >
                      {suggestion}
                    </button>
                  ))}
                  <button
                    onClick={handleRefreshSuggestions}
                    className="p-1.5 rounded-full bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-400 transition-colors"
                    title="Get new suggestions"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          )}

          <div className="max-w-4xl mx-auto w-full flex items-end space-x-2">
            <button
              onClick={toggleRecording}
              className={`p-3 rounded-xl flex-shrink-0 transition-colors shadow-sm ${isRecording ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 animate-pulse' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              title="Click to speak"
            >
              {isRecording ? <Square className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
            <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center px-4 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white dark:focus-within:bg-gray-800 transition-all shadow-sm">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={isRecording ? "Listening..." : "Type a message or use the microphone..."}
                className="w-full bg-transparent border-none focus:outline-none py-2 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none custom-scrollbar"
                disabled={isRecording}
                rows={1}
                style={{ minHeight: '40px', maxHeight: '150px' }}
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isRecording}
              className="p-3 bg-indigo-600 text-white rounded-xl flex-shrink-0 hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
