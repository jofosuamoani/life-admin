import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './lib/auth';
import { ClockProvider } from './lib/clock';
import { ToastProvider } from './lib/toast';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <ClockProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ClockProvider>
      </AuthProvider>
    </ToastProvider>
  </StrictMode>,
);
