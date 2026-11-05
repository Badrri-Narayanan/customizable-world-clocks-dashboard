import { useEffect, useRef, useState } from 'react';
import { faceClass, type FaceProps } from './types';

const FLIP_MS = 600;

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function FlipDigit({ digit }: { digit: string }) {
  const prev = useRef(digit);
  const [animating, setAnimating] = useState(false);
  useEffect(() => {
    if (prev.current === digit) return;
    prev.current = digit;
    if (prefersReducedMotion()) return;
    setAnimating(true);
    const t = setTimeout(() => setAnimating(false), FLIP_MS);
    return () => clearTimeout(t);
  }, [digit]);
  return (
    <span data-testid="flip-digit" className={`flip__tile${animating ? ' flip--animating' : ''}`}>
      {digit}
    </span>
  );
}

export function FlipFace({ dt, hour12, night, label }: FaceProps) {
  const [h, m] = dt.toFormat(hour12 ? 'hh:mm' : 'HH:mm').split(':');
  return (
    <div role="img" aria-label={label} className={faceClass('flip', night)}>
      <div className="flip">
        <FlipDigit digit={h[0]} />
        <FlipDigit digit={h[1]} />
        <span className="flip__colon">:</span>
        <FlipDigit digit={m[0]} />
        <FlipDigit digit={m[1]} />
        {hour12 && <span className="flip__ampm">{dt.toFormat('a')}</span>}
      </div>
    </div>
  );
}
