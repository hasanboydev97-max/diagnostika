import React from 'react';

// -----------------------------------------------------------
// MagicButton — animated premium button (uiverse.io inspired)
// Variants: 'primary' (dark), 'danger' (red-tinted), 'ghost' (light)
// -----------------------------------------------------------

interface MagicButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Text label shown on button */
  label: string;
  /** Icon shown to the left (optional SVG/lucide element) */
  icon?: React.ReactNode;
  /** "primary" = dark, "danger" = red, "ghost" = light border-only */
  variant?: 'primary' | 'danger' | 'ghost';
  /** Loading state — disables button and shows spinner */
  loading?: boolean;
  /** Loading label text */
  loadingLabel?: string;
  /** Extra className to merge */
  className?: string;
}

/** Split a string into individually animated <span> letters */
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

        {/* Animated text wrapper */}
        <div className="magic-btn-txt-wrapper">
          {/* txt-1: normal state */}
          <div className="magic-btn-txt-1">
            <AnimatedLetters text={loading && loadingLabel ? loadingLabel : label} />
          </div>
          {/* txt-2: focused state (same text) */}
          <div className="magic-btn-txt-2">
            <AnimatedLetters text={loading && loadingLabel ? loadingLabel : label} />
          </div>
        </div>

        {children}
      </button>
    </div>
  );
}
