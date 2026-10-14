import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { LanguageProvider } from './i18n';
import { firebaseReady } from './firebase/config';

firebaseReady.finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </React.StrictMode>
  );
});
