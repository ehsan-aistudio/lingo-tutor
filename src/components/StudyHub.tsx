import React, { useState, useEffect } from 'react';
import { RefreshCw, BookOpen, MessageSquare, Loader2, PenTool, Volume2, ChevronRight, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { getUsefulIdioms, getUsefulSentences, getUsefulGrammar, getGrammarDetails, generateSpeech } from '../lib/gemini';
import { playTTSAudio } from '../lib/audioUtils';

export default function StudyHub() {
  const [activeTab, setActiveTab] = useState<'idioms' | 'sentences' | 'grammar'>('grammar');
  const [idioms, setIdioms] = useState<any[]>([]);
  const [sentences, setSentences] = useState<any[]>([]);
  const [grammars, setGrammars] = useState<any[]>([]);
  const [isLoadingIdioms, setIsLoadingIdioms] = useState(false);
  const [isLoadingSentences, setIsLoadingSentences] = useState(false);
  const [isLoadingGrammars, setIsLoadingGrammars] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Grammar Details State
  const [selectedGrammar, setSelectedGrammar] = useState<any | null>(null);
  const [grammarDetails, setGrammarDetails] = useState<any | null>(null);
  const [isLoadingGrammarDetails, setIsLoadingGrammarDetails] = useState(false);
  
  // Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);

  const fetchIdioms = async (force: boolean = false) => {
    if (isLoadingIdioms) return;
    setIsLoadingIdioms(true);
    try {
      const data = await getUsefulIdioms(force);
      setIdioms(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingIdioms(false);
    }
  };

  const fetchSentences = async (force: boolean = false) => {
    if (isLoadingSentences) return;
    setIsLoadingSentences(true);
    try {
      const data = await getUsefulSentences(force);
      setSentences(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSentences(false);
    }
  };

  const fetchGrammars = async (force: boolean = false) => {
    if (isLoadingGrammars) return;
    setIsLoadingGrammars(true);
    try {
      const data = await getUsefulGrammar(force);
      setGrammars(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingGrammars(false);
    }
  };

  const fetchGrammarDetails = async (grammar: any) => {
    setSelectedGrammar(grammar);
    setIsLoadingGrammarDetails(true);
    setGrammarDetails(null);
    setQuizAnswers({});
    setShowQuizResults(false);
    try {
      const data = await getGrammarDetails(grammar.rule);
      setGrammarDetails(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingGrammarDetails(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'idioms' && idioms.length === 0) fetchIdioms();
    if (activeTab === 'sentences' && sentences.length === 0) fetchSentences();
    if (activeTab === 'grammar' && grammars.length === 0) fetchGrammars();
  }, [activeTab]);

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

  const handleQuizAnswer = (questionIndex: number, answer: string) => {
    if (showQuizResults) return;
    setQuizAnswers(prev => ({ ...prev, [questionIndex]: answer }));
  };

  const submitQuiz = () => {
    setShowQuizResults(true);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 shrink-0">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
          <BookOpen className="w-6 h-6 mr-3 text-indigo-600 dark:text-indigo-400" />
          Study Hub
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 shrink-0 bg-gray-50 dark:bg-gray-800/50">
        <button
          className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center transition-colors ${activeTab === 'grammar' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-white dark:bg-gray-800' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          onClick={() => { setActiveTab('grammar'); setSelectedGrammar(null); }}
        >
          <PenTool className="w-4 h-4 mr-2" /> Grammar
        </button>
        <button
          className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center transition-colors ${activeTab === 'idioms' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-white dark:bg-gray-800' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          onClick={() => setActiveTab('idioms')}
        >
          <BookOpen className="w-4 h-4 mr-2" /> Idioms
        </button>
        <button
          className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center transition-colors ${activeTab === 'sentences' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-white dark:bg-gray-800' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          onClick={() => setActiveTab('sentences')}
        >
          <MessageSquare className="w-4 h-4 mr-2" /> Sentences
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-gray-50/50 dark:bg-gray-900/50">
        <div className="max-w-4xl mx-auto">
          {activeTab === 'idioms' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <p className="text-gray-600 dark:text-gray-400">Learn common expressions with comprehensive examples.</p>
                <button onClick={() => fetchIdioms(true)} disabled={isLoadingIdioms} className="flex items-center text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-4 py-2 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors disabled:opacity-50">
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingIdioms ? 'animate-spin' : ''}`} />
                  Generate New
                </button>
              </div>
              {isLoadingIdioms && idioms.length === 0 ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {idioms.map((idm, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm relative group">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-serif text-xl text-gray-900 dark:text-gray-100 font-bold pr-8">"{idm.idiom}"</p>
                        <button 
                          onClick={() => handlePlayAudio(`idiom-${idx}`, `${idm.idiom}. ${idm.meaning}`)}
                          disabled={playingId !== null}
                          className="text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50"
                        >
                          {playingId === `idiom-${idx}` ? <Loader2 className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 mb-4 font-medium">{idm.meaning}</p>
                      
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Examples</p>
                        {idm.examples?.map((ex: string, i: number) => (
                          <p key={i} className="text-sm text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                            {ex}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'sentences' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <p className="text-gray-600 dark:text-gray-400">Useful everyday phrases and their contexts.</p>
                <button onClick={() => fetchSentences(true)} disabled={isLoadingSentences} className="flex items-center text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-4 py-2 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors disabled:opacity-50">
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingSentences ? 'animate-spin' : ''}`} />
                  Generate New
                </button>
              </div>
              {isLoadingSentences && sentences.length === 0 ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {sentences.map((sen, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm relative group">
                      <div className="flex justify-between items-start mb-4">
                        <p className="font-medium text-xl text-gray-900 dark:text-gray-100 pr-8">"{sen.sentence}"</p>
                        <button 
                          onClick={() => handlePlayAudio(`sentence-${idx}`, sen.sentence)}
                          disabled={playingId !== null}
                          className="text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50"
                        >
                          {playingId === `sentence-${idx}` ? <Loader2 className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Context</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{sen.context}</p>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mb-1">Meaning</p>
                          <p className="text-sm text-emerald-800 dark:text-emerald-300">{sen.meaning}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'grammar' && !selectedGrammar && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <p className="text-gray-600 dark:text-gray-400">Select a topic for comprehensive explanations, examples, and quizzes.</p>
                <button onClick={() => fetchGrammars(true)} disabled={isLoadingGrammars} className="flex items-center text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-4 py-2 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors disabled:opacity-50">
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingGrammars ? 'animate-spin' : ''}`} />
                  Generate New Topics
                </button>
              </div>
              {isLoadingGrammars && grammars.length === 0 ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {grammars.map((gram, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => fetchGrammarDetails(gram)}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all text-left flex justify-between items-center group"
                    >
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{gram.rule}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{gram.shortDescription}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'grammar' && selectedGrammar && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button 
                onClick={() => setSelectedGrammar(null)}
                className="flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors mb-2"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Topics
              </button>
              
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{selectedGrammar.rule}</h2>
                
                {isLoadingGrammarDetails ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                    <p className="text-gray-500 dark:text-gray-400 animate-pulse">Generating comprehensive study guide and quiz...</p>
                  </div>
                ) : grammarDetails ? (
                  <div className="space-y-10">
                    {/* Explanation */}
                    <section>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center">
                          <BookOpen className="w-5 h-5 mr-2 text-indigo-500" /> Explanation
                        </h3>
                        <button 
                          onClick={() => handlePlayAudio(`grammar-${selectedGrammar.rule}`, grammarDetails.explanation)}
                          disabled={playingId !== null}
                          className="flex items-center space-x-1 text-sm text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors disabled:opacity-50 bg-gray-100 dark:bg-gray-700/50 px-3 py-1.5 rounded-lg"
                        >
                          {playingId === `grammar-${selectedGrammar.rule}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                          <span>Listen</span>
                        </button>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                        {grammarDetails.explanation}
                      </p>
                    </section>

                    {/* Examples */}
                    <section>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                        <MessageSquare className="w-5 h-5 mr-2 text-emerald-500" /> Examples
                      </h3>
                      <div className="space-y-3">
                        {grammarDetails.examples.map((ex: string, i: number) => (
                          <div key={i} className="flex items-start bg-gray-50 dark:bg-gray-700/30 p-4 rounded-2xl">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold mr-4 shrink-0">
                              {i + 1}
                            </div>
                            <p className="text-gray-800 dark:text-gray-200 text-lg pt-0.5">{ex}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Quiz */}
                    <section className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-3xl p-6 border border-indigo-100 dark:border-indigo-800/30">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center">
                        <PenTool className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" /> Practice Quiz
                      </h3>
                      
                      <div className="space-y-8">
                        {grammarDetails.quiz.map((q: any, i: number) => {
                          const isAnswered = quizAnswers[i] !== undefined;
                          const isCorrect = quizAnswers[i] === q.answer;
                          
                          return (
                            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                              <p className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-4">
                                <span className="text-indigo-500 mr-2">{i + 1}.</span> {q.question}
                              </p>
                              <div className="space-y-3">
                                {q.options.map((opt: string, j: number) => {
                                  const isSelected = quizAnswers[i] === opt;
                                  const isActualAnswer = q.answer === opt;
                                  
                                  let btnClass = "w-full text-left p-4 rounded-xl border transition-all ";
                                  
                                  if (!showQuizResults) {
                                    btnClass += isSelected 
                                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-200 dark:ring-indigo-800" 
                                      : "border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300";
                                  } else {
                                    if (isActualAnswer) {
                                      btnClass += "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300";
                                    } else if (isSelected && !isActualAnswer) {
                                      btnClass += "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300";
                                    } else {
                                      btnClass += "border-gray-200 dark:border-gray-700 opacity-50 text-gray-500 dark:text-gray-400";
                                    }
                                  }

                                  return (
                                    <button
                                      key={j}
                                      onClick={() => handleQuizAnswer(i, opt)}
                                      disabled={showQuizResults}
                                      className={btnClass}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span>{opt}</span>
                                        {showQuizResults && isActualAnswer && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                                        {showQuizResults && isSelected && !isActualAnswer && <XCircle className="w-5 h-5 text-red-500" />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                              
                              {showQuizResults && (
                                <div className={`mt-4 p-4 rounded-xl ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300'}`}>
                                  <p className="font-semibold mb-1">{isCorrect ? 'Correct!' : 'Incorrect.'}</p>
                                  <p className="text-sm">{q.explanation}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {!showQuizResults && Object.keys(quizAnswers).length === grammarDetails.quiz.length && (
                        <div className="mt-8 flex justify-end">
                          <button 
                            onClick={submitQuiz}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-colors"
                          >
                            Check Answers
                          </button>
                        </div>
                      )}
                    </section>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
