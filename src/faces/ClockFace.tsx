import type { StyleId } from '../state/types';
import { AnalogFace } from './AnalogFace';
import { DigitalFace } from './DigitalFace';
import { FlipFace } from './FlipFace';
import { LcdFace } from './LcdFace';
import type { FaceProps } from './types';

export function ClockFace({ style, offsetLabel, ...props }: FaceProps & { style: StyleId; offsetLabel: string }) {
  switch (style) {
    case 'full':
    case 'classic':
    case 'minimal':
      return <AnalogFace {...props} variant={style} />;
    case 'digital':
      return <DigitalFace {...props} offsetLabel={offsetLabel} />;
    case 'flip':
      return <FlipFace {...props} />;
    case 'lcd':
      return <LcdFace {...props} />;
  }
}
