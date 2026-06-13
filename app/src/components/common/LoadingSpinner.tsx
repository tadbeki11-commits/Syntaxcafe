import React from 'react';

type SpinnerSize = 'small' | 'medium' | 'large' | 'xlarge';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  text?: string;
  showText?: boolean;
  className?: string;
}

/**
 * Loading Spinner Component
 * Displays a centered loading spinner with optional text
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  text = 'Loading...', 
  showText = true,
  className = '' 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
    xlarge: 'w-16 h-16'
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen bg-muted/30 ${className}`}>
      <div className="flex flex-col items-center space-y-4">
        {/* Spinner */}
        <div className={`${sizeClasses[size]} border-4 border-border border-t-blue-500 rounded-full animate-spin`}></div>
        
        {/* Loading text */}
        {showText && (
          <p className="text-muted-foreground font-medium animate-pulse">
            {text}
          </p>
        )}
      </div>
    </div>
  );
};

interface InlineSpinnerProps {
  size?: 'small' | 'medium';
  className?: string;
}

/**
 * Inline Loading Spinner
 * Smaller spinner for inline use
 */
export const InlineSpinner: React.FC<InlineSpinnerProps> = ({ size = 'small', className = '' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
  };

  return (
    <div className={`${sizeClasses[size]} border-2 border-border border-t-blue-500 rounded-full animate-spin ${className}`}></div>
  );
};

interface ButtonSpinnerProps {
  className?: string;
}

/**
 * Button Loading Spinner
 * Spinner specifically designed for buttons
 */
export const ButtonSpinner: React.FC<ButtonSpinnerProps> = ({ className = '' }) => {
  return (
    <div className={`w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ${className}`}></div>
  );
};

export default LoadingSpinner;
