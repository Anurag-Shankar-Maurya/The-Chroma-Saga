
import React from 'react';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md' }) => {
    const sizeClasses = {
        sm: 'w-5 h-5 border-2',
        md: 'w-6 h-6 border-4',
        lg: 'w-10 h-10 border-4',
    };
    
    return (
        <div 
            className={`animate-spin rounded-full border-solid border-black/10 border-l-[#A8998A] ${sizeClasses[size]}`}
            role="status"
        >
            <span className="sr-only">Loading...</span>
        </div>
    );
};
