import React, { useState, useRef, useEffect } from 'react';
import { Spinner } from './Spinner';
import type { TtsEngine } from '../types';

interface AudioControlsProps {
  onTogglePlay: () => void;
  onRestart: () => void;
  onSelectEngine: (engine: TtsEngine) => void;
  isLoading: boolean;
  isPlaying: boolean;
  isAudioLoaded: boolean;
  currentEngine: TtsEngine;
  isBrowserTtsSupported: boolean;
}

// SVG Icons
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/></svg>;
const RestartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311a1.464 1.464 0 0 1 0 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105 0l.17.31c.698 1.283 2.686.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 0-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105 0l-.1-.34zM8 10.93a2.929 2.929 0 1 1 0-5.858 2.929 2.929 0 0 1 0 5.858z"/></svg>;

export const AudioControls: React.FC<AudioControlsProps> = ({ onTogglePlay, onRestart, onSelectEngine, isLoading, isPlaying, isAudioLoaded, currentEngine, isBrowserTtsSupported }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleEngineSelect = (engine: TtsEngine) => {
    onSelectEngine(engine);
    setIsSettingsOpen(false);
  };

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
      <button
        onClick={onTogglePlay}
        disabled={isLoading}
        className="text-sm font-bold text-[#4A443E] rounded-full p-2 hover:bg-[#D1C7BC]/60 transition-all duration-200 shrink-0 flex items-center gap-2 disabled:opacity-50"
        aria-label={isPlaying ? 'Pause narrative' : 'Play narrative'}
      >
        {isLoading ? <Spinner size="sm"/> : isPlaying ? <PauseIcon /> : <PlayIcon />}
        <span className="hidden sm:inline">Play Narrative</span>
      </button>

      {(isAudioLoaded || isPlaying) && (
        <button onClick={onRestart} className="p-2 rounded-full hover:bg-[#D1C7BC]/60" aria-label="Restart playback">
          <RestartIcon />
        </button>
      )}

      <div className="relative" ref={settingsRef}>
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          disabled={!isBrowserTtsSupported}
          className="p-2 rounded-full hover:bg-[#D1C7BC]/60 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Audio settings"
        >
          <SettingsIcon />
        </button>
        {isSettingsOpen && (
          <div className="absolute bottom-full right-0 mb-2 w-40 bg-white rounded-lg shadow-xl border border-gray-200 z-10 p-1">
            <p className="text-xs text-gray-500 px-2 pt-1 pb-2">Narrator Voice</p>
            <button
              onClick={() => handleEngineSelect('gemini')}
              className={`w-full text-left text-sm px-2 py-1 rounded ${currentEngine === 'gemini' ? 'bg-[#D1C7BC]/80' : 'hover:bg-gray-100'}`}
            >
              Gemini (HD)
            </button>
            <button
              onClick={() => handleEngineSelect('browser')}
              className={`w-full text-left text-sm px-2 py-1 rounded ${currentEngine === 'browser' ? 'bg-[#D1C7BC]/80' : 'hover:bg-gray-100'}`}
            >
              Browser (Fast)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};