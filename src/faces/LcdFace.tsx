import { faceClass, type FaceProps } from './types';

export function LcdFace({ dt, hour12, night, label }: FaceProps) {
  return (
    <div role="img" aria-label={label} className={faceClass('lcd', night)}>
      <div className="lcd">
        <div className="lcd__date">{dt.toFormat('ccc dd LLL').toUpperCase()}</div>
        <div className="lcd__time">
          <span>{dt.toFormat(hour12 ? 'h:mm' : 'HH:mm')}</span>
          <span className="lcd__sec">{dt.toFormat('ss')}</span>
          {hour12 && <span className="lcd__ampm">{dt.toFormat('a')}</span>}
        </div>
      </div>
    </div>
  );
}
