import React, { useRef, useEffect } from 'react';
import type { StoryStep } from '../types';

interface SagaGalleryProps {
  storyHistory: StoryStep[];
  onNavigate: (nodeId: string) => void;
  currentNodeId: string;
}

const galleryScrollbarStyles = `
  .saga-gallery::-webkit-scrollbar { height: 4px; }
  .saga-gallery::-webkit-scrollbar-track { background: #EFEAE4; }
  .saga-gallery::-webkit-scrollbar-thumb { background: #D1C7BC; border-radius: 2px; }
`;

export const SagaGallery: React.FC<SagaGalleryProps> = ({ storyHistory, onNavigate, currentNodeId }) => {
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (galleryRef.current) {
      galleryRef.current.scrollLeft = galleryRef.current.scrollWidth;
    }
  }, [storyHistory]);

  return (
    <>
      <style>{galleryScrollbarStyles}</style>
      <div className="bg-white/80 p-3 rounded-2xl shadow-inner border border-gray-200/80">
        <div ref={galleryRef} className="saga-gallery flex items-center gap-3 overflow-x-auto pb-1">
          {storyHistory.length === 0 ? (
            <p className="text-sm text-gray-500">Your visual journey will appear here...</p>
          ) : (
            storyHistory.map((step, index) => (
              <button
                key={step.id}
                onClick={() => onNavigate(step.id)}
                disabled={step.id === currentNodeId}
                className="group relative w-20 h-16 rounded-lg shrink-0 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4A443E] disabled:cursor-not-allowed"
                aria-label={`Navigate to step ${index + 1}`}
              >
                <img
                  src={step.imageUrl}
                  alt={`Saga step ${index + 1}`}
                  className={`w-full h-full rounded-lg object-cover border-2 shadow-md transition-all ${step.id === currentNodeId ? 'border-[#4A443E]' : 'border-transparent group-hover:border-gray-400'}`}
                />
                 {step.id !== currentNodeId && (
                    <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                        </svg>
                    </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
};