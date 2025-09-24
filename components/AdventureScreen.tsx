import React from 'react';
import { SagaGallery } from './SagaGallery';
import { Spinner } from './Spinner';
import { AudioControls } from './AudioControls';
import type { StoryStep, Choice, TtsEngine } from '../types';

interface AdventureScreenProps {
  isGenerating: boolean;
  currentStep: StoryStep;
  choices: Choice[];
  storyHistory: StoryStep[];
  onChoiceMade: (choiceText: string) => void;
  onRestart: () => void;
  onShowLore: () => void;
  onShowEpilogue: () => void;
  // TTS Props
  onTogglePlayNarrative: () => void;
  onRestartPlayback: () => void;
  onSelectTtsEngine: (engine: TtsEngine) => void;
  onSelectBrowserVoice: (voiceURI: string) => void;
  isTtsLoading: boolean;
  isPlaying: boolean;
  isAudioLoaded: boolean;
  ttsEngine: TtsEngine;
  browserTtsSupported: boolean;
  browserVoices: SpeechSynthesisVoice[];
  selectedBrowserVoiceURI: string | null;
}

const ChoiceButton: React.FC<{ text: string; onClick: () => void; disabled: boolean }> = ({ text, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="w-full text-left p-4 rounded-xl bg-gray-100 hover:bg-[#D1C7BC]/60 hover:text-black transition-all duration-200 border border-transparent hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
    >
        {text}
    </button>
);

export const AdventureScreen: React.FC<AdventureScreenProps> = ({
  isGenerating,
  currentStep,
  choices,
  storyHistory,
  onChoiceMade,
  onRestart,
  onShowLore,
  onShowEpilogue,
  onTogglePlayNarrative,
  onRestartPlayback,
  onSelectTtsEngine,
  onSelectBrowserVoice,
  isTtsLoading,
  isPlaying,
  isAudioLoaded,
  ttsEngine,
  browserTtsSupported,
  browserVoices,
  selectedBrowserVoiceURI,
}) => {
  return (
    <main className="animate-fade-in">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/80 overflow-hidden">
        <div className="relative w-full aspect-video bg-[#EFEAE4] flex items-center justify-center transition-all duration-300">
            {isGenerating ? (
                <Spinner size="lg" />
            ) : (
                <img 
                    key={currentStep.imageUrl}
                    src={currentStep.imageUrl} 
                    alt="Generated story scene" 
                    className="w-full h-full object-cover animate-fade-in"
                />
            )}
        </div>
        <div className="p-6 md:p-8">
          <div className="mb-4">
            <p className="text-lg text-gray-700 min-h-[56px] transition-opacity duration-300">
              {isGenerating ? 'The next chapter is being written...' : currentStep.narrative}
            </p>
          </div>
          <div id="choices-container" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isGenerating ? (
                <>
                    <div className="w-full h-[62px] rounded-xl bg-gray-200 animate-pulse"></div>
                    <div className="w-full h-[62px] rounded-xl bg-gray-200 animate-pulse"></div>
                </>
            ) : (
                choices.map((choice, index) => (
                    <ChoiceButton
                        key={index}
                        text={choice.text}
                        onClick={() => onChoiceMade(choice.text)}
                        disabled={isGenerating}
                    />
                ))
            )}
          </div>
           <div className="flex items-center gap-4 mt-4">
              <AudioControls
                onTogglePlay={onTogglePlayNarrative}
                onRestart={onRestartPlayback}
                onSelectEngine={onSelectTtsEngine}
                onSelectBrowserVoice={onSelectBrowserVoice}
                isLoading={isTtsLoading}
                isPlaying={isPlaying}
                isAudioLoaded={isAudioLoaded}
                currentEngine={ttsEngine}
                isBrowserTtsSupported={browserTtsSupported}
                browserVoices={browserVoices}
                selectedBrowserVoiceURI={selectedBrowserVoiceURI}
              />
              <div className="flex items-center gap-2">
                <button onClick={onShowLore} className="text-sm font-bold text-[#4A443E] rounded-full p-2 hover:bg-[#D1C7BC]/60 transition-all duration-200 shrink-0">
                    ✨ Discover Lore
                </button>
                {storyHistory.length >= 3 && (
                    <button onClick={onShowEpilogue} className="text-sm font-bold text-[#4A443E] rounded-full p-2 hover:bg-[#D1C7BC]/60 transition-all duration-200 shrink-0">
                        ✨ Epilogue
                    </button>
                )}
              </div>
            </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xl font-bold text-[#4A443E]">Your Saga So Far</h3>
          <button onClick={onRestart} className="text-sm font-medium text-[#6B635B] hover:text-[#38332E] bg-gray-200/70 hover:bg-gray-300/80 px-3 py-1.5 rounded-lg transition">
            Start New Saga
          </button>
        </div>
        <SagaGallery storyHistory={storyHistory} currentImageUrl={currentStep.imageUrl}/>
      </div>
    </main>
  );
};