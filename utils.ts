import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

type SpeechRecognition = any;

export function VisionMode() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("");
  
  const sendMessage = useMutation(api.assistant.sendMessage);
  const conversations = useQuery(api.assistant.getConversationHistory, { mode: "vision", limit: 10 });
  const userPreferences = useQuery(api.assistant.getUserPreferences);
  
  // Quick actions
  
  const getQuickTime = useAction(api.assistant.getQuickTime);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const lastSpokenRef = useRef<string | null>(null);

  useEffect(() => {
  if (!conversations || conversations.length === 0) return;

  const latest = conversations[0]?.response;
  if (!latest) return;

  if (lastSpokenRef.current !== latest) {
    lastSpokenRef.current = latest;
    speakText(latest);
  }
}, [conversations]);



  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      recognitionRef.current = new (window as any).webkitSpeechRecognition();
      recognitionRef.current!.continuous = true;
      recognitionRef.current!.interimResults = false;
      recognitionRef.current!.lang = 'en-US';
      
     recognitionRef.current!.onresult = (event: any) => {
  const transcript = event.results[0][0].transcript
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, ""); // remove punctuation

  console.log("Heard:", transcript); // 🔍 DEBUG

  // 🛑 STOP COMMANDS (robust)
  if (
    transcript.includes("stop") ||
    transcript.includes("silence") ||
    transcript.includes("quiet")
  ) {
    stopSpeaking();
    stopListening();
    toast.info("Speech stopped");
    return; // ⛔ DO NOT send to backend
  }

  setCurrentMessage(transcript);
  handleSendMessage(transcript);
};


      
      recognitionRef.current!.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current!.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast.error("Speech recognition error. Please try again.");
      };
    }
    
    synthRef.current = window.speechSynthesis;
  }, []);

  const startListening = () => {

  if (recognitionRef.current && !isListening) {
    setIsListening(true);
    recognitionRef.current.start();
    toast.info("Listening...");
  }
};


  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    
    try {
      await sendMessage({ message: message.trim(), mode: "vision" });
      setCurrentMessage("");
      toast.success("Message sent! Generating response...");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    }
  };

 const speakText = (text: string) => {
  if (!synthRef.current) return;

  // HARD STOP anything queued
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = userPreferences?.voiceSpeed || 1.0;
  utterance.pitch = userPreferences?.voicePitch || 1.0;

  utterance.onstart = () => {
    setIsSpeaking(true);
  };

  utterance.onend = () => {
    setIsSpeaking(false);
  };

  utterance.onerror = () => {
    setIsSpeaking(false);
  };

  synthRef.current.speak(utterance);
};



  const stopSpeaking = () => {
  window.speechSynthesis.cancel();

  if (synthRef.current) {
    synthRef.current.cancel();
  }

  if (recognitionRef.current) {
    recognitionRef.current.stop();
  }

  setIsSpeaking(false);
  setIsListening(false);
};



  const handleQuickTime = async () => {
  try {
    const result = await getQuickTime();
    let spokenText = "";

    if (!result.error) {
      spokenText = `The current time is ${result.currentTime}`;
    } else {
      spokenText = "Sorry, I couldn't get the current time.";
    }

    speakText(spokenText);
    toast.success("Getting time information...");
  } catch (error) {
    console.error("Error getting time:", error);
    toast.error("Failed to get time information.");
  }
};


  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-blue-600 mb-4">
          👁️ Vision Assistance Mode
        </h2>
        <p className="text-gray-600 mb-6">
          Ask questions using your voice and receive spoken responses with real-time information
        </p>
      </div>

      {/* Voice Controls */}
      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={isListening ? stopListening : startListening}
          className={`px-8 py-4 rounded-lg font-semibold text-lg transition-all ${
            isListening
              ? "bg-red-600 text-white animate-pulse"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
          aria-label={isListening ? "Stop listening" : "Start voice input"}
        >
          {isListening ? "🛑 Stop Listening" : "🎤 Ask Question"}
        </button>
        
        {isSpeaking && (
          <button
            onClick={stopSpeaking}
            className="px-8 py-4 bg-red-600 text-white rounded-lg font-semibold text-lg hover:bg-red-700 transition-all"
            aria-label="Stop speaking"
          >
            🔇 Stop Speaking
          </button>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-3">Quick Actions:</h3>
        <div className="flex flex-wrap gap-3">
          
          <button
            onClick={handleQuickTime}

            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            disabled={isSpeaking}
          >
            🕐 Time
          </button>
        </div>
      </div>

      {/* Current Message Display */}
      {currentMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 font-medium">Your question:</p>
          <p className="text-blue-900 text-lg">{currentMessage}</p>
        </div>
      )}

      {/* Conversation History */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {conversations?.map((conv) => (
          <div key={conv._id} className="border rounded-lg p-4 space-y-3">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="font-medium text-blue-800">You asked:</p>
              <p className="text-blue-900">{conv.message}</p>
            </div>
            
            {conv.response && (
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium text-green-800">AI Response:</p>
                  
                </div>
                <p className="text-green-900">{conv.response}</p>
              </div>
            )}
            
            {!conv.response && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-600 italic">Generating response...</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-800 mb-2">How to use:</h3>
        <ul className="text-yellow-700 space-y-1">
          <li>• Click "Ask Question" and speak your question clearly</li>
          <li>• Try asking about weather, news, or time for real-time information</li>
          <li>• Use Quick Actions for instant weather, news, or time updates</li>
          <li>• Click "Speak" next to any response to hear it aloud</li>
          <li>• Adjust voice settings in the Settings panel above</li>
        </ul>
      </div>
    </div>
  );
}
