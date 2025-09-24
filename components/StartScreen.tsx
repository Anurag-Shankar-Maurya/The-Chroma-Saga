
import React, { useState } from 'react';
import { Spinner } from './Spinner';

interface StartScreenProps {
  onStart: (prompt: string) => void;
  isGenerating: boolean;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, isGenerating }) => {
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (prompt.trim() === '') {
      setError(true);
      setTimeout(() => setError(false), 2000);
      return;
    }
    onStart(prompt);
  };

  return (
    <main className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-gray-200/80 transition-all duration-500 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Begin Your Journey</h2>
        <p className="text-gray-600 mb-6">Describe the world you want to create. Your words will generate the first scene of your unique saga.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="prompt-input"
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isGenerating && handleSubmit()}
            className={`w-full px-4 bg-white py-3 rounded-xl border transition ${error ? 'border-red-500 bg-red-300 animate-pulse' : 'border-gray-300 focus:ring-2 focus:ring-[#C8BBAE] focus:border-[#C8BBAE]'}`}
            placeholder={error ? "Please enter a prompt to begin!" : "e.g., A floating city in a crimson sky..."}
            disabled={isGenerating}
          />
          <button
            id="start-btn"
            onClick={handleSubmit}
            disabled={isGenerating}
            className="bg-[#4A443E] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#38332E] transition-transform duration-200 hover:scale-105 active:scale-100 disabled:bg-gray-400 disabled:scale-100 flex items-center justify-center"
          >
            {isGenerating ? <Spinner /> : 'Create My World ✨'}
          </button>
        </div>
      </div>
    </main>
  );
};
