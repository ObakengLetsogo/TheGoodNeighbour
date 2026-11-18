import '@fontsource/urbanist/latin-400.css';
import '@fontsource/urbanist/latin-500.css';
import '@fontsource/urbanist/latin-600.css';
import '@fontsource/urbanist/latin-700.css';
import '@fontsource/urbanist/latin-800.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

document.documentElement.classList.add('js');
createRoot(document.getElementById('root')!).render(<App />);
