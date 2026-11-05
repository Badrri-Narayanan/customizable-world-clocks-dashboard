import { render, screen } from '@testing-library/react';
import App from '../src/App';

test('renders the app heading', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'World Clock' })).toBeInTheDocument();
});
