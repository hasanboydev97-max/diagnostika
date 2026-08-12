import React from 'react';

interface MagicButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  /** Icon shown on the RIGHT side (like the app's original → Play icon) */
  icon?: React.ReactNode;
  variant?: 'primary' | 'danger' | 'ghost';
  loading?: boolean;
  loadingLabel?: string;
  /** Make the button full-width */
  fullWidth?: boolean;
}

function AnimatedLetters({ text }: { text: string }) {
  return (
    <>
      {text.split('').map((char, i) => (
        <span
          key={i}
          className="magic-btn-letter"
          style={{ animationDelay: `${i * 0.06}s` }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </>
  );
}

export default function MagicButton({
  label,
  icon,
  variant = 'primary',
  loading = false,
  loadingLabel,
  fullWidth = false,
  disabled,
  className = '',
  ...rest
}: MagicButtonProps) {
  const displayText = loading && loadingLabel ? loadingLabel : label;

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`magic-btn magic-btn--${variant}${fullWidth ? ' magic-btn--full' : ''} ${className}`}
    >
      {/* Left: label */}
      <span className="magic-btn-label">
        <AnimatedLetters text={displayText} />
      </span>

      {/* Right: spinner or icon */}
      {loading ? (
        <span className="magic-btn-spinner" aria-hidden="true" />
      ) : icon ? (
        <span className="magic-btn-icon-right" aria-hidden="true">
          {icon}
        </span>
      ) : null}
    </button>
  );
}
