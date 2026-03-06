import React, { useState, useEffect, useRef } from 'react';
import { connectLiveTutor } from '../lib/gemini';
import { LiveAudioRecorder, LiveAudioPlayer } from '../lib/audioUtils';
import { Mic, Square, X, Loader2, Sparkles } from 'lucide-react';

interface LiveTutorModalProps {
  scenario: string;
  onClose: () => void;
}

export default function LiveTutorModal({ scenario, onClose }: LiveTutorModalProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const sessionRef = useRef<any>(null);
  const recorderRef = useRef<LiveAudioRecorder | null>(null);
  const playerRef = useRef<LiveAudioPlayer | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const initLive = async () => {
      try {
        playerRef.current = new LiveAudioPlayer();
        
        const sessionPromise = connectLiveTutor(
          scenario,
          (base64Audio) => {
            if (playerRef.current) playerRef.current.play(base64Audio);
          },
          () => {
            if (playerRef.current) playerRef.current.stop();
          }
        );
        
        sessionRef.current = sessionPromise;
        
        const session = await sessionPromise;
        
        if (!isMounted) {
          session.close();
          return;
        }

        setIsConnected(true);
        setIsConnecting(false);

        startRecording(sessionPromise);

      } catch (err) {
        console.error('Live API Error:', err);
        setIsConnecting(false);
      }
    };

    initLive();

    return () => {
      isMounted = false;
      if (recorderRef.current) recorderRef.current.stop();
      if (playerRef.current) playerRef.current.stop();
      if (sessionRef.current) {
        sessionRef.current.then((s: any) => s.close()).catch(() => {});
      }
    };
  }, [scenario]);

  const startRecording = async (sessionPromise: Promise<any>) => {
    recorderRef.current = new LiveAudioRecorder();
    setIsRecording(true);
    await recorderRef.current.start((base64Data) => {
      sessionPromise.then((session: any) => {
        session.sendRealtimeInput([{
          mimeType: 'audio/pcm;rate=16000',
          data: base64Data
        }]);
      });
    });
  };

  const stopRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-50 to-transparent" />
        
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 z-10 bg-white/50 rounded-full p-2 backdrop-blur-md">
          <X className="w-5 h-5" />
        </button>
        
        <div className="text-center mb-10 relative z-10 mt-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl mb-4 shadow-inner">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Live Roleplay</h2>
          <p className="text-gray-500 font-medium">{scenario}</p>
        </div>

        <div className="flex flex-col items-center justify-center space-y-8 relative z-10">
          {isConnecting ? (
            <div className="flex flex-col items-center text-indigo-500 py-8">
              <Loader2 className="w-10 h-10 animate-spin mb-4" />
              <p className="font-medium">Connecting to Tutor...</p>
            </div>
          ) : (
            <>
              <div className="relative">
                <div className={`absolute inset-0 rounded-full transition-all duration-500 ${isRecording ? 'bg-indigo-400 animate-ping opacity-20' : 'opacity-0'}`} />
                <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 relative z-10 ${isRecording ? 'bg-indigo-100 scale-105 shadow-[0_0_40px_rgba(99,102,241,0.3)]' : 'bg-gray-50 border-2 border-gray-100'}`}>
                  <Mic className={`w-12 h-12 transition-colors duration-300 ${isRecording ? 'text-indigo-600' : 'text-gray-400'}`} />
                </div>
              </div>
              
              <div className="text-center h-16">
                <p className="text-lg font-semibold text-gray-800 mb-1">
                  {isRecording ? "Listening..." : "Paused"}
                </p>
                <p className="text-sm text-gray-500">
                  {isRecording ? "Speak naturally. The tutor will respond." : "Click resume to continue talking."}
                </p>
              </div>

              <button
                onClick={() => isRecording ? stopRecording() : startRecording(sessionRef.current)}
                className={`flex items-center space-x-2 px-8 py-4 rounded-full font-semibold transition-all shadow-lg ${
                  isRecording 
                    ? 'bg-red-50 text-red-600 hover:bg-red-100 shadow-red-100' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 hover:-translate-y-0.5'
                }`}
              >
                {isRecording ? (
                  <>
                    <Square className="w-5 h-5" />
                    <span>Stop Recording</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" />
                    <span>Resume Recording</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
