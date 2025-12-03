import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/design-system.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Initialize i18n before rendering
import './i18n';

// Loading fallback for Suspense while translations load
const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '1rem',
    color: 'var(--text-secondary, #666)'
  }}>
    Loading...
  </div>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Suspense fallback={<LoadingFallback />}>
      <App />
    </Suspense>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
