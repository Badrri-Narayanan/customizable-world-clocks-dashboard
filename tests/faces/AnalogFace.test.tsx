import { render, screen } from '@testing-library/react';
import { AnalogFace } from '../../src/faces/AnalogFace';
import { zoned } from '../../src/time/zoned';
import { utc } from '../helpers/utc';

const dt = zoned('Asia/Kolkata', utc('2026-11-05T04:40:30')); // 10:10:30 in Chennai
const props = { dt, hour12: true, night: false, label: 'Chennai, 10:10 AM Thursday' };

const angle = (container: HTMLElement, hand: string): number => {
  const el = container.querySelector<HTMLElement>(`.react-clock__${hand}-hand`)!;
  const deg = Number(/rotate\(([-\d.]+)deg\)/.exec(el.style.transform)![1]);
  return ((deg % 360) + 360) % 360;
};
const numbers = (container: HTMLElement) =>
  [...container.querySelectorAll('.react-clock__mark__number')].map((n) => n.textContent).filter(Boolean);

test('hands show the zone time regardless of browser zone (AC10)', () => {
  const { container } = render(<AnalogFace {...props} variant="full" />);
  expect(angle(container, 'hour')).toBeCloseTo(305.25);
  expect(angle(container, 'minute')).toBeCloseTo(63);
  expect(angle(container, 'second')).toBeCloseTo(180);
});

test('full shows all 12 numbers', () => {
  const { container } = render(<AnalogFace {...props} variant="full" />);
  expect(numbers(container)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
});

test('classic shows only 3, 6, 9, 12', () => {
  const { container } = render(<AnalogFace {...props} variant="classic" />);
  expect(numbers(container)).toEqual(['3', '6', '9', '12']);
});

test('minimal has no numbers and no second hand', () => {
  const { container } = render(<AnalogFace {...props} variant="minimal" />);
  expect(numbers(container)).toEqual([]);
  expect(container.querySelector('.react-clock__second-hand')).toBeNull();
});

test('accessible label and night class', () => {
  const { container } = render(<AnalogFace {...props} night variant="full" />);
  expect(screen.getByRole('img', { name: props.label })).toBeInTheDocument();
  expect(container.firstElementChild).toHaveClass('face', 'face--analog', 'face--full', 'face--night');
});
