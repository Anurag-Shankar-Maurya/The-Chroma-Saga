import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StartScreen } from './components/StartScreen';
import { AdventureScreen } from './components/AdventureScreen';
import { Modal } from './components/Modal';
import { Spinner } from './components/Spinner';
import type { StoryStep, Choice } from './types';
import { generateNarrativeAndChoices, generateImage, generateLore, generateEpilogue, generateTtsAudio } from './services/geminiService';

enum GameState {
  Start,
  Adventure,
}

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.Start);
  const [storyHistory, setStoryHistory] = useState<StoryStep[]>([]);
  const [currentChoices, setCurrentChoices] = useState<Choice[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  const [isLoreModalOpen, setIsLoreModalOpen] = useState<boolean>(false);
  const [loreContent, setLoreContent] = useState<string>('');
  const [isLoreLoading, setIsLoreLoading] = useState<boolean>(false);

  const [isEpilogueModalOpen, setIsEpilogueModalOpen] = useState<boolean>(false);
  const [epilogueContent, setEpilogueContent] = useState<string>('');
  const [isEpilogueLoading, setIsEpilogueLoading] = useState<boolean>(false);

  // TTS State
  const [isTtsLoading, setIsTtsLoading] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Reset audio when story progresses
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setIsPlaying(false);
    setIsTtsLoading(false);
  }, [storyHistory]);


  const handleStartGame = useCallback(async (initialPrompt: string) => {
    setIsGenerating(true);
    setStoryHistory([]);
    setCurrentChoices([]);

    try {
      const [narrativeResult, imageResult] = await Promise.all([
        generateNarrativeAndChoices(initialPrompt, ''),
        generateImage(`${initialPrompt} - detailed cinematic digital painting`)
      ]);

      setStoryHistory([{
        prompt: initialPrompt,
        narrative: narrativeResult.narrative,
        imageUrl: imageResult,
        choiceMade: ''
      }]);
      setCurrentChoices(narrativeResult.choices);
      setGameState(GameState.Adventure);
    } catch (error) {
      console.error("Failed to start saga:", error);
      alert("A strange rift has appeared, preventing your saga from beginning. Please try again.");
      setGameState(GameState.Start);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleChoiceMade = useCallback(async (choiceText: string) => {
    if (isGenerating || storyHistory.length === 0) return;
    
    setIsGenerating(true);
    setCurrentChoices([]);
    const previousStep = storyHistory[storyHistory.length - 1];

    try {
      const [narrativeResult, imageResult] = await Promise.all([
        generateNarrativeAndChoices(previousStep.narrative, choiceText),
        generateImage(`${previousStep.narrative}, ${choiceText} - detailed cinematic digital painting`)
      ]);

      const newStep: StoryStep = {
        prompt: previousStep.narrative,
        narrative: narrativeResult.narrative,
        imageUrl: imageResult,
        choiceMade: choiceText
      };

      setStoryHistory(prevHistory => [...prevHistory, newStep]);
      setCurrentChoices(narrativeResult.choices);
    } catch (error) {
      console.error("Failed to generate next step:", error);
      alert("The thread of fate has frayed. The saga cannot continue. Please start a new one.");
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, storyHistory]);

  const handleRestart = useCallback(() => {
    setGameState(GameState.Start);
    setStoryHistory([]);
    setCurrentChoices([]);
  }, []);
  
  const handleShowLore = useCallback(async () => {
    if (storyHistory.length === 0) return;
    setIsLoreModalOpen(true);
    setIsLoreLoading(true);
    setLoreContent('');
    try {
      const lore = await generateLore(storyHistory[storyHistory.length - 1].narrative);
      setLoreContent(lore);
    } catch (error) {
      console.error("Failed to generate lore:", error);
      setLoreContent('A whisper of lore fades into the ether. Try again later.');
    } finally {
      setIsLoreLoading(false);
    }
  }, [storyHistory]);

  const handleShowEpilogue = useCallback(async () => {
    if (storyHistory.length === 0) return;
    setIsEpilogueModalOpen(true);
    setIsEpilogueLoading(true);
    setEpilogueContent('');
    try {
      const epilogue = await generateEpilogue(storyHistory);
      setEpilogueContent(epilogue);
    } catch (error) {
      console.error("Failed to generate epilogue:", error);
      setEpilogueContent('The ending of your tale is yet unwritten. Try again later.');
    } finally {
      setIsEpilogueLoading(false);
    }
  }, [storyHistory]);

  const handleTogglePlayNarrative = useCallback(async () => {
    if (isTtsLoading) return;
    const narrativeText = storyHistory[storyHistory.length - 1]?.narrative;
    if (!narrativeText) return;

    if (audioRef.current) {
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
        }
    } else {
        setIsTtsLoading(true);
        try {
            const audioUrl = await generateTtsAudio(narrativeText);
            const audio = new Audio(audioUrl);
            audioRef.current = audio;
            audio.addEventListener('ended', () => setIsPlaying(false));
            audio.play();
            setIsPlaying(true);
        } catch (error) {
            console.error("Failed to play narrative:", error);
            alert("The storyteller's voice falters. Please try again.");
        } finally {
            setIsTtsLoading(false);
        }
    }
  }, [storyHistory, isPlaying, isTtsLoading]);

  const currentStep = storyHistory.length > 0 ? storyHistory[storyHistory.length - 1] : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div id="app-container" className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-[#4A443E]">The Chroma-Saga</h1>
          <p className="text-lg text-[#6B635B] mt-1">A Dynamic Visual Epic, Powered by AI</p>
        </header>

        {gameState === GameState.Start && (
          <StartScreen onStart={handleStartGame} isGenerating={isGenerating} />
        )}

        {gameState === GameState.Adventure && currentStep && (
          <AdventureScreen
            isGenerating={isGenerating}
            currentStep={currentStep}
            choices={currentChoices}
            storyHistory={storyHistory}
            onChoiceMade={handleChoiceMade}
            onRestart={handleRestart}
            onShowLore={handleShowLore}
            onShowEpilogue={handleShowEpilogue}
            onTogglePlayNarrative={handleTogglePlayNarrative}
            isTtsLoading={isTtsLoading}
            isPlaying={isPlaying}
          />
        )}
        
        <Modal title="Uncovered Lore" isOpen={isLoreModalOpen} onClose={() => setIsLoreModalOpen(false)}>
          {isLoreLoading ? <Spinner /> : <p className="text-gray-700">{loreContent}</p>}
        </Modal>

        <Modal title="The Saga Concludes..." isOpen={isEpilogueModalOpen} onClose={() => setIsEpilogueModalOpen(false)}>
          {isEpilogueLoading ? <Spinner /> : <p className="text-gray-700">{epilogueContent}</p>}
        </Modal>
      </div>
    </div>
  );
};

export default App;