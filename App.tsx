import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StartScreen } from './components/StartScreen';
import { AdventureScreen } from './components/AdventureScreen';
import { Modal } from './components/Modal';
import { Spinner } from './components/Spinner';
import type { StoryStep, Choice, TtsEngine } from './types';
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
  const [ttsEngine, setTtsEngine] = useState<TtsEngine>('gemini');
  const [browserTtsSupported, setBrowserTtsSupported] = useState(false);
  const [isTtsLoading, setIsTtsLoading] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Browser TTS Voice State
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedBrowserVoiceURI, setSelectedBrowserVoiceURI] = useState<string | null>(null);


  // Check for browser TTS support and load voices on mount
  useEffect(() => {
    const isSupported = 'speechSynthesis' in window && typeof window.speechSynthesis !== 'undefined';
    setBrowserTtsSupported(isSupported);

    if (isSupported) {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                setBrowserVoices(voices);
                // Set default voice if none is selected
                if (!selectedBrowserVoiceURI) {
                    const defaultVoice = voices.find(v => v.default) || voices[0];
                    if (defaultVoice) {
                      setSelectedBrowserVoiceURI(defaultVoice.voiceURI);
                    }
                }
            }
        };

        loadVoices();
        // Voices are often loaded asynchronously
        window.speechSynthesis.onvoiceschanged = loadVoices;

        // Ensure speech is cancelled when the user leaves the page
        const handleBeforeUnload = () => window.speechSynthesis.cancel();
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            window.speechSynthesis.onvoiceschanged = null;
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }
  }, [selectedBrowserVoiceURI]);

  // Reset audio when story progresses
  useEffect(() => {
    // Stop and clear Gemini TTS audio
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    // Stop and clear Browser TTS audio
    if (browserTtsSupported && (window.speechSynthesis.speaking || window.speechSynthesis.paused)) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    
    setIsPlaying(false);
    setIsTtsLoading(false);
  }, [storyHistory, browserTtsSupported]);


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

  const handleSelectTtsEngine = useCallback((engine: TtsEngine) => {
    if (audioRef.current) {
        audioRef.current.pause();
    }
    if (browserTtsSupported) {
        window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setTtsEngine(engine);
  }, [browserTtsSupported]);

  const handleSelectBrowserVoice = (voiceURI: string) => {
    setSelectedBrowserVoiceURI(voiceURI);
    if (window.speechSynthesis.speaking || window.speechSynthesis.paused) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  };

  const handleRestartPlayback = useCallback(() => {
    const narrativeText = storyHistory[storyHistory.length - 1]?.narrative;
    if (!narrativeText) return;

    if (ttsEngine === 'gemini') {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
            setIsPlaying(true);
        } else {
            // If audio isn't loaded, trigger the play function to load it
            handleTogglePlayNarrative();
        }
    } else if (browserTtsSupported) {
        // Restarting is the same as starting fresh
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(narrativeText);
        const selectedVoice = browserVoices.find(v => v.voiceURI === selectedBrowserVoiceURI);
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => {
          setIsPlaying(false);
          utteranceRef.current = null;
        };
        utterance.onpause = () => setIsPlaying(false);
        utterance.onresume = () => setIsPlaying(true);
        utterance.onerror = (e) => {
          console.error("SpeechSynthesis Error:", e.error);
          setIsPlaying(false);
        };
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }
  }, [storyHistory, ttsEngine, browserTtsSupported, browserVoices, selectedBrowserVoiceURI]);

  const handleTogglePlayNarrative = useCallback(async () => {
    if (isTtsLoading) return;
    const narrativeText = storyHistory[storyHistory.length - 1]?.narrative;
    if (!narrativeText) return;

    // --- Browser TTS Logic (Refactored for stability) ---
    if (ttsEngine === 'browser' && browserTtsSupported) {
        // State: Paused. Action: Resume.
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            return;
        }

        // State: Speaking. Action: Pause.
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            return;
        }
        
        // State: Stopped. Action: Speak new utterance.
        const utterance = new SpeechSynthesisUtterance(narrativeText);
        const selectedVoice = browserVoices.find(v => v.voiceURI === selectedBrowserVoiceURI);
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        // Let event handlers exclusively manage the isPlaying state
        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => {
            setIsPlaying(false);
            utteranceRef.current = null;
        };
        utterance.onpause = () => setIsPlaying(false);
        utterance.onresume = () => setIsPlaying(true);
        utterance.onerror = (event) => {
            console.error('SpeechSynthesis Error:', event.error);
            setIsPlaying(false);
        };
        
        utteranceRef.current = utterance;
        window.speechSynthesis.cancel(); // Clear any previous utterances before speaking.
        window.speechSynthesis.speak(utterance);
        return;
    }

    // --- Gemini TTS Logic ---
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
  }, [storyHistory, isPlaying, isTtsLoading, ttsEngine, browserTtsSupported, browserVoices, selectedBrowserVoiceURI]);

  const currentStep = storyHistory.length > 0 ? storyHistory[storyHistory.length - 1] : null;
  const isAudioLoaded = !!audioRef.current || (browserTtsSupported && (window.speechSynthesis.speaking || window.speechSynthesis.paused));


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
            // TTS Props
            onTogglePlayNarrative={handleTogglePlayNarrative}
            onRestartPlayback={handleRestartPlayback}
            onSelectTtsEngine={handleSelectTtsEngine}
            onSelectBrowserVoice={handleSelectBrowserVoice}
            isTtsLoading={isTtsLoading}
            isPlaying={isPlaying}
            isAudioLoaded={isAudioLoaded}
            ttsEngine={ttsEngine}
            browserTtsSupported={browserTtsSupported}
            browserVoices={browserVoices}
            selectedBrowserVoiceURI={selectedBrowserVoiceURI}
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