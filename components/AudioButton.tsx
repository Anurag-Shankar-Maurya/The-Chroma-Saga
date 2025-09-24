import React from 'react';
import { Spinner } from './Spinner';

interface AudioButtonProps {
  onClick: () => void;
  isLoading: boolean;
  isPlaying: boolean;
}

const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
    </svg>
);

const PauseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/>
    </svg>
);


export const AudioButton: React.FC<AudioButtonProps> = ({ onClick, isLoading, isPlaying }) => {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="text-sm font-bold text-[#4A443E] rounded-full p-2 hover:bg-[#D1C7BC]/60 transition-all duration-200 shrink-0 flex items-center gap-2 disabled:opacity-50"
      aria-label={isPlaying ? 'Pause narrative' : 'Play narrative'}
    >
      {isLoading ? <Spinner size="sm"/> : isPlaying ? <PauseIcon /> : <PlayIcon />}
      Play Narrative
    </button>
  );
};