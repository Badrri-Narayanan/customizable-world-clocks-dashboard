import type { DateTime } from 'luxon';

export type FaceProps = { dt: DateTime; hour12: boolean; night: boolean; label: string; size?: number };

export const faceClass = (kind: string, night: boolean): string => `face face--${kind}${night ? ' face--night' : ''}`;
