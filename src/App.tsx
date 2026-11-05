import { Dashboard } from './components/Dashboard';
import { AppStateProvider } from './state/AppStateProvider';
import { TimeProvider } from './time/TimeProvider';
import './theme.css';
import './App.css';

export default function App() {
  return (
    <AppStateProvider>
      <TimeProvider>
        <Dashboard />
      </TimeProvider>
    </AppStateProvider>
  );
}
