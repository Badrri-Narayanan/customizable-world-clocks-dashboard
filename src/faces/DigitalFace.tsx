import { faceClass, type FaceProps } from './types';

export function DigitalFace({ dt, hour12, night, label, offsetLabel }: FaceProps & { offsetLabel: string }) {
  return (
    <div role="img" aria-label={label} className={faceClass('digital', night)}>
      <div className="digital">
        <div className="digital__time">
          <span>{dt.toFormat(hour12 ? 'h:mm' : 'HH:mm')}</span>
          {hour12 && <small className="digital__ampm">{dt.toFormat('a')}</small>}
        </div>
        <div className="digital__date">{[dt.toFormat('ccc d LLL'), offsetLabel].filter(Boolean).join(' · ')}</div>
      </div>
    </div>
  );
}
