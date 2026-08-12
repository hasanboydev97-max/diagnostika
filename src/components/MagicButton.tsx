import React from 'react';

// -----------------------------------------------------------
// MagicButton — animated premium button (uiverse.io inspired)
// Variants: 'primary' (dark), 'danger' (red-tinted), 'ghost' (light)
// -----------------------------------------------------------

interface MagicButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'danger' | 'ghost';
  loading?: boolean;
  loadingLabel?: string;
  className?: string;
}

function AnimatedLetters({ text }: { text: string }) {
  return (
    <>
      {text.split('').map((char, i) => (
        <span
          key={i}
          className="magic-btn-letter"
          style={{ animationDelay: `${i * 0.08}s` }}
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
  className = '',
  disabled,
  children,
  ...rest
}: MagicButtonProps) {
  const hue =
    variant === 'danger' ? '0deg' : variant === 'ghost' ? '220deg' : '210deg';

  const displayText = loading && loadingLabel ? loadingLabel : label;

  return (
    <div className="magic-btn-wrapper">
      <button
        {...rest}
        disabled={disabled || loading}
        className={`magic-btn magic-btn--${variant} ${className}`}
        style={{ '--highlight-color-hue': hue } as React.CSSProperties}
      >
        {/* Icon / Spinner */}
        {loading ? (
          <span className="magic-btn-spinner" aria-hidden="true" />
        ) : icon ? (
          <span className="magic-btn-icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}

        {/* Simple label — always visible */}
        <span className="magic-btn-label">
          <AnimatedLetters text={displayText} />
        </span>

        {children}
      </button>
    </div>
  );
}
