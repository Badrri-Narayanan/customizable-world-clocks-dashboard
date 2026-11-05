import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '../../src/components/Dashboard';
import { buildShareUrl } from '../../src/share/shareLink';
import { STORAGE_KEY } from '../../src/state/storage';
import { CHENNAI, FIXTURE_CITIES, LONDON, NOW, renderWithProviders, seedState, SYDNEY } from '../helpers/fixtures';

vi.mock('../../src/cities/cities', async (orig) => ({
  ...(await orig<typeof import('../../src/cities/cities')>()),
  loadCities: () => Promise.resolve(FIXTURE_CITIES),
}));
const zone = vi.hoisted(() => ({ value: 'Europe/London' }));
vi.mock('../../src/time/browserZone', () => ({ browserZone: () => zone.value }));

const card = (name: string) => screen.findByRole('article', { name });
const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!);

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, '', '/');
  zone.value = 'Europe/London';
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe('first run home detection (AC14)', () => {
  test('adds the browser-zone city as home', async () => {
    zone.value = 'Asia/Kolkata';
    renderWithProviders(<Dashboard />);
    expect(within(await card('Chennai')).getByText('You')).toBeInTheDocument();
  });
  test('does not re-add home after the user removed it', async () => {
    seedState({ cities: [{ id: SYDNEY.id }] });
    zone.value = 'Asia/Kolkata';
    renderWithProviders(<Dashboard />);
    await card('Sydney');
    expect(screen.queryByRole('article', { name: 'Chennai' })).toBeNull();
  });
});

test('empty state invites adding a city', async () => {
  seedState({ cities: [] });
  renderWithProviders(<Dashboard />);
  expect(await screen.findByText(/Add your first city/)).toBeInTheDocument();
});

test('meeting planner shifts every card and returns to now (AC12)', async () => {
  seedState({ cities: [{ id: LONDON.id }, { id: SYDNEY.id }], homeCityId: LONDON.id });
  const user = userEvent.setup();
  renderWithProviders(<Dashboard />);
  expect(within(await card('Sydney')).getByText('3:40 AM')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('slider', { name: 'Meeting planner' }), { target: { value: '180' } });
  expect(within(await card('Sydney')).getByText('6:30 AM')).toBeInTheDocument();
  expect(within(await card('London')).getByText('7:30 PM')).toBeInTheDocument();
  expect(screen.getByText(/Previewing Thu 7:30 PM \(your time\)/)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Back to now' }));
  expect(within(await card('Sydney')).getByText('3:40 AM')).toBeInTheDocument();
  expect(screen.queryByText(/Previewing/)).toBeNull();
});

describe('share links (AC13)', () => {
  beforeEach(() => {
    seedState({ cities: [{ id: LONDON.id }], homeCityId: LONDON.id });
    history.replaceState(null, '', new URL(buildShareUrl([SYDNEY.id, LONDON.id], 'http://localhost/')).hash);
  });
  test('Add merges cities without duplicates and clears the hash', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />);
    expect(await screen.findByText('Someone shared 2 cities with you')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add to my dashboard' }));
    await card('Sydney');
    expect(stored().cities.map((c: { id: string }) => c.id)).toEqual([LONDON.id, SYDNEY.id]);
    expect(location.hash).toBe('');
    expect(screen.queryByText(/Someone shared/)).toBeNull();
  });
  test('Dismiss leaves the dashboard alone', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />);
    await user.click(await screen.findByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('article', { name: 'Sydney' })).toBeNull();
    expect(location.hash).toBe('');
  });
});

describe('top bar', () => {
  beforeEach(() => seedState({ cities: [{ id: LONDON.id }, { id: SYDNEY.id }], homeCityId: LONDON.id }));

  test('adding from search creates a card', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />);
    await card('London');
    await user.type(screen.getByRole('combobox', { name: 'Add a city' }), 'chen');
    await user.click(await screen.findByRole('option', { name: /Chennai/ }));
    await card('Chennai');
    expect(stored().cities.map((c: { id: string }) => c.id)).toContain(CHENNAI.id);
  });

  test('theme button cycles system → light → dark', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />);
    expect(document.documentElement.dataset.theme).toBe('system');
    await user.click(screen.getByRole('button', { name: /Theme: System/ }));
    expect(document.documentElement.dataset.theme).toBe('light');
    await user.click(screen.getByRole('button', { name: /Theme: Light/ }));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  test('24-hour toggle changes card times', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />);
    await card('Sydney');
    await user.click(screen.getByRole('button', { name: '24h' }));
    expect(within(await card('Sydney')).getByText('03:40')).toBeInTheDocument();
  });

  test('default style select changes faces without overrides', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />);
    await card('Sydney');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Default clock style' }), 'flip');
    expect(within(await card('Sydney')).getAllByTestId('flip-digit')).toHaveLength(4);
    expect(stored().settings.defaultStyle).toBe('flip');
  });

  test('settings: reset everything after confirmation', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithProviders(<Dashboard />);
    await card('Sydney');
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Reset everything' }));
    expect(screen.queryByRole('article', { name: 'Sydney' })).toBeNull();
  });

  test('share copies a link when Web Share is unavailable', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    renderWithProviders(<Dashboard />);
    await card('Sydney');
    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining(`#/share?c=${LONDON.id},${SYDNEY.id}`));
    expect(await screen.findByText('Link copied')).toBeInTheDocument();
  });
});
