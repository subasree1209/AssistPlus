import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { VisionMode } from "./VisionMode";
import { HearingMode } from "./HearingMode";
import { SpeechMode } from "./SpeechMode";
import { SettingsPanel } from "./SettingsPanel";

type Mode = "vision" | "hearing" | "speech";

export function AssistantInterface() {
  const [currentMode, setCurrentMode] = useState<Mode>("vision");
  const [showSettings, setShowSettings] = useState(false);
  
  const userPreferences = useQuery(api.assistant.getUserPreferences);
  const updatePreferences = useMutation(api.assistant.updateUserPreferences);

  useEffect(() => {
    if (userPreferences?.preferredMode) {
      setCurrentMode(userPreferences.preferredMode);
    }
  }, [userPreferences]);

  const handleModeChange = async (mode: Mode) => {
    setCurrentMode(mode);
    await updatePreferences({ preferredMode: mode });
  };

  const getFontSizeClass = () => {
    switch (userPreferences?.fontSize) {
      case "small": return "text-sm";
      case "large": return "text-lg";
      case "extra-large": return "text-xl";
      default: return "text-base";
    }
  };

  const getContrastClass = () => {
    return userPreferences?.highContrast 
      ? "bg-white text-white" 
      : "bg-gray-50 text-gray-900";
  };

  return (
    <div className={`${getFontSizeClass()} ${getContrastClass()} min-h-screen transition-all duration-300`}>
      {/* Mode Selection */}
      <div className="mb-8">
        <div className="flex flex-wrap justify-center gap-4 mb-4">
          <button
            onClick={() => handleModeChange("vision")}
            className={`px-6 py-4 rounded-lg font-semibold text-lg transition-all ${
              currentMode === "vision"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50"
            }`}
            aria-label="Vision assistance mode"
          >
            👁️ Vision Assistance
          </button>
          <button
            onClick={() => handleModeChange("hearing")}
            className={`px-6 py-4 rounded-lg font-semibold text-lg transition-all ${
              currentMode === "hearing"
                ? "bg-green-600 text-white shadow-lg"
                : "bg-white text-green-600 border-2 border-green-600 hover:bg-green-50"
            }`}
            aria-label="Hearing assistance mode"
          >
            👂 Hearing Assistance
          </button>
          <button
            onClick={() => handleModeChange("speech")}
            className={`px-6 py-4 rounded-lg font-semibold text-lg transition-all ${
              currentMode === "speech"
                ? "bg-purple-600 text-white shadow-lg"
                : "bg-white text-purple-600 border-2 border-purple-600 hover:bg-purple-50"
            }`}
            aria-label="Speech assistance mode"
          >
            🗣️ Speech Assistance
          </button>
        </div>
        
        <div className="text-center">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            aria-label="Toggle settings"
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-8">
          <SettingsPanel />
        </div>
      )}

      {/* Mode-specific Interface */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        {currentMode === "vision" && <VisionMode />}
        {currentMode === "hearing" && <HearingMode />}
        {currentMode === "speech" && <SpeechMode />}
      </div>
    </div>
  );
}
