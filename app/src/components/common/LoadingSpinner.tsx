import React from 'react';

type SpinnerSize = 'small' | 'medium' | 'large' | 'xlarge';

const SIZE_PX: Record<SpinnerSize, number> = {
  small: 18,
  medium: 32,
  large: 48,
  xlarge: 64,
};

const THICKNESS: Record<SpinnerSize, number> = {
  small: 2,
  medium: 3,
  large: 4,
  xlarge: 5,
};

/**
 * Smooth conic-gradient ring spinner. Themed via design tokens so it adapts to
 * light/dark automatically. A faint full-circle track sits behind a spinning
 * gradient arc, masked into a ring.
 */
const Ring: React.FC<{ size: SpinnerSize }> = ({ size }) => {
  const px = SIZE_PX[size];
  const t = THICKNESS[size];
  const ringMask = `radial-gradient(farthest-side, transparent calc(100% - ${t}px), #000 calc(100% - ${t}px))`;

  return (
    <span className="relative inline-block" style={{ width: px, height: px }}>
      {/* faint track */}
      <span
        className="absolute inset-0 rounded-full"
        style={{ border: `${t}px solid hsl(var(--muted))` }}
      />
      {/* spinning gradient arc */}
      <span
        className="absolute inset-0 rounded-full animate-spin"
        style={{
          background:
            'conic-gradient(from 90deg, transparent 5%, hsl(var(--primary)))',
          WebkitMask: ringMask,
          mask: ringMask,
          animationDuration: '0.8s',
        }}
      />
    </span>
  );
};

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  text?: string;
  showText?: boolean;
  /** Show the app logo above the spinner (full-screen branded loader). */
  showLogo?: boolean;
  /** Render inline (no full-screen wrapper). */
  inline?: boolean;
  className?: string;
}

/**
 * Loading Spinner Component
 * Full-screen, centered loading state with an optional logo and label.
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  text = 'Loading…',
  showText = true,
  showLogo = true,
  inline = false,
  className = '',
}) => {
  const body = (
    <div className="flex flex-col items-center gap-5">
      {showLogo && (
        <img
          src="/assets/logo.png?v=8"
          alt="Logo"
          className="h-16 w-16 object-contain opacity-90 animate-pulse"
          style={{ animationDuration: '2s' }}
        />
      )}

      <div className="relative flex items-center justify-center">
        {/* soft glow behind the ring */}
        <span className="absolute h-16 w-16 rounded-full bg-primary/10 blur-xl" />
        <Ring size={size} />
      </div>

      {showText && (
        <p className="text-sm font-medium text-muted-foreground tracking-wide animate-pulse">
          {text}
        </p>
      )}
    </div>
  );

  if (inline) {
    return <div className={`flex items-center justify-center ${className}`}>{body}</div>;
  }

  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted/40 ${className}`}
    >
      {body}
    </div>
  );
};

interface InlineSpinnerProps {
  size?: 'small' | 'medium';
  className?: string;
}

/**
 * Inline Loading Spinner — smaller ring for inline use.
 */
export const InlineSpinner: React.FC<InlineSpinnerProps> = ({ size = 'small', className = '' }) => {
  return (
    <span className={`inline-flex ${className}`}>
      <Ring size={size === 'medium' ? 'medium' : 'small'} />
    </span>
  );
};

interface ButtonSpinnerProps {
  className?: string;
}

/**
 * Button Loading Spinner — sits on a solid (primary) button, so it uses the
 * foreground color rather than the theme primary.
 */
export const ButtonSpinner: React.FC<ButtonSpinnerProps> = ({ className = '' }) => {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
};

export default LoadingSpinner;
