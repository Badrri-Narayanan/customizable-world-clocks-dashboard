import { render, screen } from '@testing-library/react';
import { DateTime } from 'luxon';
import { ClockFace } from '../../src/faces/ClockFace';
import { DigitalFace } from '../../src/faces/DigitalFace';
import { FlipFace } from '../../src/faces/FlipFace';
import { LcdFace } from '../../src/faces/LcdFace';
import { STYLE_IDS } from '../../src/state/types';

const dt = DateTime.fromISO('2026-11-04T22:10:30', { zone: 'Asia/Kolkata' }); // Wednesday
const base = { dt, night: false, label: 'Chennai, 10:10 PM Wednesday' };

describe('DigitalFace', () => {
  test('24h', () => {
    render(<DigitalFace {...base} hour12={false} offsetLabel="+5h 30m" />);
    expect(screen.getByText('22:10')).toBeInTheDocument();
    expect(screen.getByText(/Wed 4 Nov · \+5h 30m/)).toBeInTheDocument();
  });
  test('12h shows PM', () => {
    render(<DigitalFace {...base} hour12 offsetLabel="" />);
    expect(screen.getByText('10:10')).toBeInTheDocument();
    expect(screen.getByText('PM')).toBeInTheDocument();
  });
});

describe('FlipFace', () => {
  const digits = () => screen.getAllByTestId('flip-digit');
  test('renders four digit tiles', () => {
    render(<FlipFace {...base} hour12={false} />);
    expect(digits().map((d) => d.textContent)).toEqual(['2', '2', '1', '0']);
  });
  test('a changed digit animates', () => {
    const { rerender } = render(<FlipFace {...base} hour12={false} />);
    expect(digits()[3]).not.toHaveClass('flip--animating');
    rerender(<FlipFace {...base} dt={dt.plus({ minutes: 1 })} hour12={false} />);
    expect(digits()[3]).toHaveClass('flip--animating');
    expect(digits()[2]).not.toHaveClass('flip--animating');
  });
});

test('LcdFace shows time, seconds and date', () => {
  render(<LcdFace {...base} hour12={false} />);
  expect(screen.getByText('22:10')).toBeInTheDocument();
  expect(screen.getByText('30')).toBeInTheDocument();
  expect(screen.getByText('WED 04 NOV')).toBeInTheDocument();
});

test.each(STYLE_IDS)('ClockFace renders style %s with an accessible label (AC9)', (style) => {
  render(<ClockFace {...base} hour12={false} style={style} offsetLabel="+5h 30m" />);
  expect(screen.getByRole('img', { name: base.label })).toBeInTheDocument();
});
