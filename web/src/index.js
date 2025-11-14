import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Note: React.StrictMode is disabled for WebSocket connections
// StrictMode intentionally double-mounts components in development,
// which causes duplicate WebSocket connections and disconnections.
// This is only an issue in development mode.
root.render(<App />);
