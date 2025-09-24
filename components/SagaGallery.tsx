
import React, { useRef, useEffect } from 'react';
import type { StoryStep } from '../types';

interface SagaGalleryProps {
  storyHistory: StoryStep[];
  currentImageUrl: string;
}

const galleryScrollbarStyles = `
  .saga-gallery::-webkit-scrollbar { height: 4px; }
  .saga-gallery::-webkit-scrollbar-track { background: #EFEAE4; }
  .saga-gallery::-webkit-scrollbar-thumb { background: #D1C7BC; border-radius: 2px; }
`;

export const SagaGallery: React.FC<SagaGalleryProps> = ({ storyHistory, currentImageUrl }) => {
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
              <img
                key={index}
                src={step.imageUrl}
                alt={`Saga step ${index + 1}`}
                className={`w-20 h-16 rounded-lg object-cover border-2 shadow-md shrink-0 transition-all ${step.imageUrl === currentImageUrl ? 'border-[#4A443E]' : 'border-transparent'}`}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
};
