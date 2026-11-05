import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CitySearch } from '../../src/components/CitySearch';
import { CHENNAI, FIXTURE_CITIES, NOW } from '../helpers/fixtures';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

const setup = (added = new Set<string>()) => {
  const onAdd = vi.fn();
  render(<CitySearch cities={FIXTURE_CITIES} onAdd={onAdd} addedIds={added} />);
  return { onAdd, user: userEvent.setup(), input: screen.getByRole('combobox') };
};

test('typing shows matching cities with label, time and offset', async () => {
  const { user, input } = setup();
  await user.type(input, 'chen');
  const option = await screen.findByRole('option', { name: /Chennai, Tamil Nadu, India/ });
  expect(option).toHaveTextContent('10:10');
});

test('Enter adds the highlighted city and clears the box', async () => {
  const { user, input, onAdd } = setup();
  await user.type(input, 'chen');
  await screen.findByRole('option', { name: /Chennai/ });
  await user.keyboard('{Enter}');
  expect(onAdd).toHaveBeenCalledWith(CHENNAI.id);
  expect(input).toHaveValue('');
});

test('already-added cities are disabled and cannot be added', async () => {
  const { user, input, onAdd } = setup(new Set([CHENNAI.id]));
  await user.type(input, 'chen');
  const option = await screen.findByRole('option', { name: /Chennai/ });
  expect(option).toHaveAttribute('aria-disabled', 'true');
  expect(option).toHaveTextContent('Added');
  await user.click(option);
  expect(onAdd).not.toHaveBeenCalled();
});

test('Escape closes the list', async () => {
  const { user, input } = setup();
  await user.type(input, 'chen');
  await screen.findByRole('listbox');
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('listbox')).toBeNull();
});

test('shows a loading hint while cities load', async () => {
  render(<CitySearch cities={null} onAdd={() => {}} addedIds={new Set()} />);
  await userEvent.setup().type(screen.getByRole('combobox'), 'a');
  expect(screen.getByText('Loading cities…')).toBeInTheDocument();
});
