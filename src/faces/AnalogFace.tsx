import Clock from 'react-clock';
import 'react-clock/dist/Clock.css';
import { toWallClockDate } from '../time/zoned';
import { faceClass, type FaceProps } from './types';
import './faces.css';

export type AnalogVariant = 'full' | 'classic' | 'minimal';

const QUARTERS = [12, 3, 6, 9];
const quarterHours = (_locale: string | undefined, hour: number) => (QUARTERS.includes(hour) ? String(hour) : '');

const VARIANT_PROPS = {
  full: { renderNumbers: true, hourHandWidth: 4, minuteHandWidth: 3, secondHandWidth: 1 },
  classic: { renderNumbers: true, formatHour: quarterHours, hourHandWidth: 5, minuteHandWidth: 3, secondHandWidth: 1 },
  minimal: {
    renderNumbers: false,
    renderMinuteMarks: false,
    renderSecondHand: false,
    hourMarksLength: 4,
    hourMarksWidth: 1,
    hourHandWidth: 2,
    minuteHandWidth: 1,
  },
} as const;

export function AnalogFace({ dt, night, label, size = 150, variant }: FaceProps & { variant: AnalogVariant }) {
  return (
    <div role="img" aria-label={label} className={`${faceClass('analog', night)} face--${variant}`}>
      <Clock value={toWallClockDate(dt)} size={size} {...VARIANT_PROPS[variant]} />
    </div>
  );
}
