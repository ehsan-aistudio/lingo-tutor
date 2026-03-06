import React, { useState, useEffect } from 'react';
import { X, RefreshCw, BookOpen, MessageSquare, Loader2, PenTool, Volume2 } from 'lucide-react';
import { getUsefulIdioms, getUsefulSentences, getUsefulGrammar, generateSpeech } from '../lib/gemini';
import { playTTSAudio } from '../lib/audioUtils';

interface StudySheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StudySheet({ isOpen, onClose }: StudySheetProps) {
  const [activeTab, setActiveTab] = useState<'idioms' | 'sentences' | 'grammar'>('idioms');
  const [idioms, setIdioms] = useState<any[]>([]);
  const [sentences, setSentences] = useState<any[]>([]);
  const [grammars, setGrammars] = useState<any[]>([]);
  const [isLoadingIdioms, setIsLoadingIdioms] = useState(false);
  const [isLoadingSentences, setIsLoadingSentences] = useState(false);
  const [isLoadingGrammars, setIsLoadingGrammars] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const fetchIdioms = async () => {
    setIsLoadingIdioms(true);
    try {
      const data = await getUsefulIdioms();
      setIdioms(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingIdioms(false);
    }
  };

  const fetchSentences = async () => {
    setIsLoadingSentences(true);
    try {
      const data = await getUsefulSentences();
      setSentences(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSentences(false);
    }
  };

  const fetchGrammars = async () => {
    setIsLoadingGrammars(true);
    try {
      const data = await getUsefulGrammar();
      setGrammars(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingGrammars(false);
    }
  };

  useEffect(() => {
    if (isOpen && idioms.length === 0) fetchIdioms();
    if (isOpen && sentences.length === 0) fetchSentences();
    if (isOpen && grammars.length === 0) fetchGrammars();
  }, [isOpen]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-indigo-600" />
            Study Materials
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0">
          <button
            className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center transition-colors ${activeTab === 'idioms' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('idioms')}
          >
            <BookOpen className="w-4 h-4 mr-2 hidden sm:block" /> Idioms
          </button>
          <button
            className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center transition-colors ${activeTab === 'sentences' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('sentences')}
          >
            <MessageSquare className="w-4 h-4 mr-2 hidden sm:block" /> Sentences
          </button>
          <button
            className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center transition-colors ${activeTab === 'grammar' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('grammar')}
          >
            <PenTool className="w-4 h-4 mr-2 hidden sm:block" /> Grammar
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-gray-50/50">
          {activeTab === 'idioms' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-500">Learn common expressions</p>
                <button onClick={fetchIdioms} disabled={isLoadingIdioms} className="flex items-center text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors disabled:opacity-50">
                  <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingIdioms ? 'animate-spin' : ''}`} />
                  Generate New
                </button>
              </div>
              {isLoadingIdioms && idioms.length === 0 ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
              ) : (
                idioms.map((idm, idx) => (
                  <div key={idx} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm relative group">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-serif text-lg text-gray-900 font-bold pr-8">"{idm.idiom}"</p>
                      <button 
                        onClick={() => handlePlayAudio(`idiom-${idx}`, `${idm.idiom}. ${idm.meaning}`)}
                        disabled={playingId !== null}
                        className="absolute top-4 right-4 text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
                      >
                        {playingId === `idiom-${idx}` ? <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{idm.meaning}</p>
                    <p className="text-sm text-indigo-600 italic bg-indigo-50/50 p-2 rounded-lg">e.g., {idm.example}</p>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'sentences' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-500">Useful everyday phrases</p>
                <button onClick={fetchSentences} disabled={isLoadingSentences} className="flex items-center text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors disabled:opacity-50">
                  <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingSentences ? 'animate-spin' : ''}`} />
                  Generate New
                </button>
              </div>
              {isLoadingSentences && sentences.length === 0 ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
              ) : (
                sentences.map((sen, idx) => (
                  <div key={idx} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm relative group">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium text-lg text-gray-900 pr-8">"{sen.sentence}"</p>
                      <button 
                        onClick={() => handlePlayAudio(`sentence-${idx}`, sen.sentence)}
                        disabled={playingId !== null}
                        className="absolute top-4 right-4 text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
                      >
                        {playingId === `sentence-${idx}` ? <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-1"><span className="font-semibold text-gray-700">Context:</span> {sen.context}</p>
                    <p className="text-sm text-emerald-700 bg-emerald-50 p-2 rounded-lg mt-2"><span className="font-semibold">Meaning:</span> {sen.meaning}</p>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-500">Essential grammar rules</p>
                <button onClick={fetchGrammars} disabled={isLoadingGrammars} className="flex items-center text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors disabled:opacity-50">
                  <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingGrammars ? 'animate-spin' : ''}`} />
                  Generate New
                </button>
              </div>
              {isLoadingGrammars && grammars.length === 0 ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
              ) : (
                grammars.map((gram, idx) => (
                  <div key={idx} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm relative group">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-lg text-gray-900 pr-8">{gram.rule}</p>
                      <button 
                        onClick={() => handlePlayAudio(`grammar-${idx}`, `${gram.rule}. Example: ${gram.example}`)}
                        disabled={playingId !== null}
                        className="absolute top-4 right-4 text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
                      >
                        {playingId === `grammar-${idx}` ? <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{gram.explanation}</p>
                    <p className="text-sm text-blue-700 bg-blue-50 p-2 rounded-lg"><span className="font-semibold">Example:</span> {gram.example}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
