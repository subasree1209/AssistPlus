import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function SettingsPanel() {
  const userPreferences = useQuery(api.assistant.getUserPreferences);
  const updatePreferences = useMutation(api.assistant.updateUserPreferences);

  const handleVoiceSpeedChange = async (speed: number) => {
    await updatePreferences({ voiceSpeed: speed });
    toast.success("Voice speed updated!");
  };

  const handleVoicePitchChange = async (pitch: number) => {
    await updatePreferences({ voicePitch: pitch });
    toast.success("Voice pitch updated!");
  };

  const handleFontSizeChange = async (fontSize: "small" | "medium" | "large" | "extra-large") => {
    await updatePreferences({ fontSize });
    toast.success("Font size updated!");
  };

  const handleContrastToggle = async () => {
    await updatePreferences({ highContrast: !userPreferences?.highContrast });
    toast.success("Contrast mode toggled!");
  };

  if (!userPreferences) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">⚙️ Accessibility Settings</h2>
      
      {/* Voice Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">Voice Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Voice Speed */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Voice Speed: {userPreferences.voiceSpeed}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={userPreferences.voiceSpeed}
              onChange={(e) => handleVoiceSpeedChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              aria-label="Voice speed control"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Slow</span>
              <span>Normal</span>
              <span>Fast</span>
            </div>
          </div>
          
          {/* Voice Pitch */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Voice Pitch: {userPreferences.voicePitch}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={userPreferences.voicePitch}
              onChange={(e) => handleVoicePitchChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              aria-label="Voice pitch control"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Low</span>
              <span>Normal</span>
              <span>High</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Display Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">Display Settings</h3>
        
        {/* Font Size */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Font Size
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(["small", "medium", "large", "extra-large"] as const).map((size) => (
              <button
                key={size}
                onClick={() => handleFontSizeChange(size)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  userPreferences.fontSize === size
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
                aria-label={`Set font size to ${size}`}
              >
                {size === "extra-large" ? "XL" : size.charAt(0).toUpperCase() + size.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        {/* High Contrast */}
        <div>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={userPreferences.highContrast}
              onChange={handleContrastToggle}
              className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              aria-label="Toggle high contrast mode"
            />
            <span className="text-sm font-medium text-gray-600">
              High Contrast Mode
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Increases contrast for better visibility
          </p>
        </div>
      </div>
      
      {/* Test Voice Button */}
      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={() => {
            const utterance = new SpeechSynthesisUtterance("This is a test of your voice settings.");
            utterance.rate = userPreferences.voiceSpeed;
            utterance.pitch = userPreferences.voicePitch;
            window.speechSynthesis.speak(utterance);
          }}
          className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
          aria-label="Test voice settings"
        >
          🔊 Test Voice Settings
        </button>
      </div>
    </div>
  );
}
