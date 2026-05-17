import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function HearingMode() {
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  
  const saveLiveTranscription = useMutation(api.assistant.saveLiveTranscription);
  const transcriptions = useQuery(api.assistant.getLiveTranscriptions, { limit: 20 });
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      recognitionRef.current = new (window as any).webkitSpeechRecognition();
      recognitionRef.current!.continuous = true;
      recognitionRef.current!.interimResults = true;
      recognitionRef.current!.lang = 'en-US';
      
      recognitionRef.current!.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        let final = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          
          if (event.results[i].isFinal) {
            final += transcript;
            // Save final transcription
            saveLiveTranscription({
              text: transcript,
              confidence: confidence || 0.9,
              isComplete: true,
            });
          } else {
            interim += transcript;
          }
        }
        
        setCurrentTranscript(final);
        setInterimTranscript(interim);
      };
      
      recognitionRef.current!.onend = () => {
        if (isListening) {
          // Restart recognition if we're still supposed to be listening
          recognitionRef.current!.start();
        }
      };
      
      recognitionRef.current!.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          // Continue listening for no-speech errors
          return;
        }
        toast.error("Speech recognition error. Please try again.");
      };
    }
  }, [isListening, saveLiveTranscription]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      setCurrentTranscript("");
      setInterimTranscript("");
      recognitionRef.current.start();
      toast.success("Live transcription started!");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      setIsListening(false);
      recognitionRef.current.stop();
      toast.info("Live transcription stopped.");
    }
  };

  const clearTranscriptions = () => {
    setCurrentTranscript("");
    setInterimTranscript("");
    toast.info("Transcriptions cleared.");
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-green-600 mb-4">
          👂 Hearing Assistance Mode
        </h2>
        <p className="text-gray-600 mb-6">
          Real-time speech-to-text transcription for live conversations
        </p>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={isListening ? stopListening : startListening}
          className={`px-8 py-4 rounded-lg font-semibold text-lg transition-all ${
            isListening
              ? "bg-red-600 text-white animate-pulse"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
          aria-label={isListening ? "Stop transcription" : "Start live transcription"}
        >
          {isListening ? "🛑 Stop Transcription" : "🎤 Start Live Transcription"}
        </button>
        
        <button
          onClick={clearTranscriptions}
          className="px-6 py-4 bg-gray-600 text-white rounded-lg font-semibold text-lg hover:bg-gray-700 transition-all"
          aria-label="Clear transcriptions"
        >
          🗑️ Clear
        </button>
      </div>

      {/* Live Transcription Display */}
      <div className="bg-white border-2 border-green-200 rounded-lg p-6 min-h-[200px]">
        <h3 className="text-lg font-semibold text-green-800 mb-4">
          Live Transcription:
        </h3>
        
        {isListening && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Listening...</span>
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          {/* Current transcript */}
          {currentTranscript && (
            <p className="text-lg text-gray-900 bg-green-50 p-3 rounded border-l-4 border-green-500">
              {currentTranscript}
            </p>
          )}
          
          {/* Interim transcript */}
          {interimTranscript && (
            <p className="text-lg text-gray-600 italic bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
              {interimTranscript}
            </p>
          )}
          
          {!isListening && !currentTranscript && !interimTranscript && (
            <p className="text-gray-500 italic text-center py-8">
              Click "Start Live Transcription" to begin converting speech to text
            </p>
          )}
        </div>
      </div>

      {/* Transcription History */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Recent Transcriptions:
        </h3>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {transcriptions?.map((transcription) => (
            <div
              key={transcription._id}
              className="bg-white p-3 rounded border-l-4 border-green-400"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-sm text-gray-500">
                  {new Date(transcription.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-xs text-gray-400">
                  {Math.round(transcription.confidence * 100)}% confidence
                </span>
              </div>
              <p className="text-gray-900">{transcription.text}</p>
            </div>
          ))}
          
          {(!transcriptions || transcriptions.length === 0) && (
            <p className="text-gray-500 italic text-center py-4">
              No transcriptions yet. Start listening to see your speech converted to text.
            </p>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">How to use:</h3>
        <ul className="text-blue-700 space-y-1">
          <li>• Click "Start Live Transcription" to begin</li>
          <li>• Speak clearly and at a normal pace</li>
          <li>• Gray italic text shows what's being processed</li>
          <li>• Black text shows completed transcriptions</li>
          <li>• All transcriptions are saved automatically</li>
        </ul>
      </div>
    </div>
  );
}
