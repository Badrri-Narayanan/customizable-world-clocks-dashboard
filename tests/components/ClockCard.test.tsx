import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClockCard } from '../../src/components/ClockCard';
import { useAppState } from '../../src/state/AppStateProvider';
import { FIXTURE_CITIES, LONDON, NEW_YORK, NOW, renderWithProviders, seedState, SYDNEY } from '../helpers/fixtures';

function Cards() {
  const { state } = useAppState();
  return (
    <>
      {state.cities.map((entry) => {
        const city = FIXTURE_CITIES.find((c) => c.id === entry.id)!;
        return (
          <ClockCard key={entry.id} city={city} entry={entry} homeZone={LONDON.zone} isHome={entry.id === state.homeCityId} />
        );
      })}
    </>
  );
}

const card = (name: string) => screen.getByRole('article', { name });

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  seedState({ cities: [{ id: LONDON.id }, { id: NEW_YORK.id }, { id: SYDNEY.id }], homeCityId: LONDON.id });
});
afterEach(() => vi.useRealTimers());

test('Sydney: tomorrow, +11h, asleep, night face', () => {
  renderWithProviders(<Cards />);
  const c = within(card('Sydney'));
  expect(c.getByText('Tomorrow')).toBeInTheDocument();
  expect(c.getByText('+11h')).toBeInTheDocument();
  expect(c.getByText('Probably asleep')).toBeInTheDocument();
  expect(c.getByRole('img')).toHaveClass('face--night');
  expect(c.getByText('3:40 AM')).toBeInTheDocument();
});

test('New York: DST notice and working hours', () => {
  renderWithProviders(<Cards />);
  const c = within(card('New York'));
  expect(c.getByText('Clocks went back 4 days ago')).toBeInTheDocument();
  expect(c.getByText('Working hours')).toBeInTheDocument();
  expect(c.getByText('−5h')).toBeInTheDocument();
});

test('London shows the "You" marker and province/country', () => {
  renderWithProviders(<Cards />);
  const c = within(card('London'));
  expect(c.getByText('You')).toBeInTheDocument();
  expect(c.getByText('Westminster, United Kingdom')).toBeInTheDocument();
  expect(within(card('Sydney')).queryByText('You')).toBeNull();
});

test('remove deletes the card', async () => {
  const user = userEvent.setup();
  renderWithProviders(<Cards />);
  await user.click(screen.getByRole('button', { name: 'Remove Sydney' }));
  expect(screen.queryByRole('article', { name: 'Sydney' })).toBeNull();
});

test('menu: change style to Flip, then back to default', async () => {
  const user = userEvent.setup();
  renderWithProviders(<Cards />);
  await user.click(screen.getByRole('button', { name: 'Options for Sydney' }));
  await user.click(screen.getByRole('button', { name: 'Flip' }));
  expect(within(card('Sydney')).getAllByTestId('flip-digit')).toHaveLength(4);
  await user.click(screen.getByRole('button', { name: 'Options for Sydney' }));
  await user.click(screen.getByRole('button', { name: 'Use default style' }));
  expect(within(card('Sydney')).queryAllByTestId('flip-digit')).toHaveLength(0);
});

test('menu: custom hours change the badge and show a marker', async () => {
  const user = userEvent.setup();
  renderWithProviders(<Cards />);
  await user.click(screen.getByRole('button', { name: 'Options for Sydney' }));
  await user.click(screen.getByRole('button', { name: 'Set custom hours' }));
  const workFrom = screen.getByLabelText('Working hours from');
  await user.clear(workFrom);
  await user.type(workFrom, '03:00');
  await user.click(screen.getByRole('button', { name: 'Save hours' }));
  const c = within(card('Sydney'));
  expect(c.getByText('custom hours')).toBeInTheDocument();
  expect(c.getByText('Working hours')).toBeInTheDocument();
  expect(c.queryByText('Probably asleep')).toBeNull();
});

test('menu: set as my city', async () => {
  const user = userEvent.setup();
  renderWithProviders(<Cards />);
  await user.click(screen.getByRole('button', { name: 'Options for Sydney' }));
  await user.click(screen.getByRole('button', { name: 'Set as my city' }));
  expect(within(card('Sydney')).getByText('You')).toBeInTheDocument();
});
