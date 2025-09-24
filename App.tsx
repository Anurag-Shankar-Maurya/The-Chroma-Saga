import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
  // New state for branching story tree
  const [storyNodes, setStoryNodes] = useState<{ [id: string]: StoryStep }>({});
  const [rootNodeId, setRootNodeId] = useState<string | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  
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

  // Helper to derive the current linear path from the story tree
  const storyHistory = useMemo(() => {
    if (!currentNodeId || Object.keys(storyNodes).length === 0) return [];
    const path: StoryStep[] = [];
    let currentId: string | null = currentNodeId;
    while (currentId) {
        const node = storyNodes[currentId];
        if (node) {
            path.unshift(node);
            currentId = node.parentId;
        } else {
            break;
        }
    }
    return path;
  }, [currentNodeId, storyNodes]);

  const currentStep = currentNodeId ? storyNodes[currentNodeId] : null;
  const currentChoices = currentStep ? currentStep.choices : [];

  // Check for browser TTS support and load voices on mount
  useEffect(() => {
    const isSupported = 'speechSynthesis' in window && typeof window.speechSynthesis !== 'undefined';
    setBrowserTtsSupported(isSupported);

    if (isSupported) {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                setBrowserVoices(voices);
                if (!selectedBrowserVoiceURI) {
                    const defaultVoice = voices.find(v => v.default) || voices[0];
                    if (defaultVoice) {
                      setSelectedBrowserVoiceURI(defaultVoice.voiceURI);
                    }
                }
            }
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
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
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    if (browserTtsSupported && (window.speechSynthesis.speaking || window.speechSynthesis.paused)) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    
    setIsPlaying(false);
    setIsTtsLoading(false);
  }, [currentNodeId, browserTtsSupported]);


  const handleStartGame = useCallback(async (initialPrompt: string) => {
    setIsGenerating(true);
    setStoryNodes({});
    setRootNodeId(null);
    setCurrentNodeId(null);

    try {
      const [narrativeResult, imageResult] = await Promise.all([
        generateNarrativeAndChoices(initialPrompt, ''),
        generateImage(`${initialPrompt} - detailed cinematic digital painting`)
      ]);
      
      const newNodeId = Date.now().toString();
      const newStep: StoryStep = {
        id: newNodeId,
        parentId: null,
        narrative: narrativeResult.narrative,
        imageUrl: imageResult,
        choiceMade: 'The Beginning',
        promptForStep: initialPrompt,
        choices: narrativeResult.choices,
        childrenIds: {}
      };
      
      setStoryNodes({ [newNodeId]: newStep });
      setRootNodeId(newNodeId);
      setCurrentNodeId(newNodeId);
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
    if (isGenerating || !currentStep) return;
    
    const existingChildId = currentStep.childrenIds[choiceText];
    if (existingChildId) {
      setCurrentNodeId(existingChildId);
      return;
    }

    setIsGenerating(true);
    
    try {
      const imageGenerationPrompt = `${choiceText} - detailed cinematic digital painting`;
      const [narrativeResult, imageResult] = await Promise.all([
        generateNarrativeAndChoices(currentStep.narrative, choiceText),
        generateImage(imageGenerationPrompt, currentStep.imageUrl)
      ]);
      
      const newChildId = Date.now().toString();
      const newChildNode: StoryStep = {
        id: newChildId,
        parentId: currentStep.id,
        narrative: narrativeResult.narrative,
        imageUrl: imageResult,
        choiceMade: choiceText,
        promptForStep: currentStep.narrative,
        choices: narrativeResult.choices,
        childrenIds: {}
      };

      setStoryNodes(prevNodes => {
          const updatedParent = { ...prevNodes[currentStep.id] };
          updatedParent.childrenIds[choiceText] = newChildId;
          return {
              ...prevNodes,
              [currentStep.id]: updatedParent,
              [newChildId]: newChildNode,
          };
      });
      setCurrentNodeId(newChildId);

    } catch (error) {
      console.error("Failed to generate next step:", error);
      alert("The thread of fate has frayed. The saga cannot continue. Please start a new one.");
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, currentStep, storyNodes]);

  const handleNavigateToStep = useCallback(async (nodeId: string) => {
    if (isGenerating || nodeId === currentNodeId) {
      return;
    }
    setCurrentNodeId(nodeId);
  }, [isGenerating, currentNodeId]);

  const handleRestart = useCallback(() => {
    setGameState(GameState.Start);
    setStoryNodes({});
    setRootNodeId(null);
    setCurrentNodeId(null);
  }, []);
  
  const handleShowLore = useCallback(async () => {
    if (!currentStep) return;
    setIsLoreModalOpen(true);
    setIsLoreLoading(true);
    setLoreContent('');
    try {
      const lore = await generateLore(currentStep.narrative);
      setLoreContent(lore);
    } catch (error) {
      console.error("Failed to generate lore:", error);
      setLoreContent('A whisper of lore fades into the ether. Try again later.');
    } finally {
      setIsLoreLoading(false);
    }
  }, [currentStep]);

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

  const handleTogglePlayNarrative = useCallback(async () => {
    if (isTtsLoading) return;
    const narrativeText = currentStep?.narrative;
    if (!narrativeText) return;

    if (ttsEngine === 'browser' && browserTtsSupported) {
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            return;
        }
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            return;
        }
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
        utterance.onerror = (event) => {
            console.error('SpeechSynthesis Error:', event.error);
            setIsPlaying(false);
        };
        utteranceRef.current = utterance;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        return;
    }

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
  }, [currentStep, isPlaying, isTtsLoading, ttsEngine, browserTtsSupported, browserVoices, selectedBrowserVoiceURI]);

  const handleRestartPlayback = useCallback(() => {
    const narrativeText = currentStep?.narrative;
    if (!narrativeText) return;

    if (ttsEngine === 'gemini') {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
            setIsPlaying(true);
        } else {
            handleTogglePlayNarrative();
        }
    } else if (browserTtsSupported) {
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
  }, [currentStep, ttsEngine, browserTtsSupported, browserVoices, selectedBrowserVoiceURI, handleTogglePlayNarrative]);

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
            onNavigate={handleNavigateToStep}
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