import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log('main.tsx: Execution started');

const rootElement = document.getElementById('root');
if (rootElement) {
    console.log('main.tsx: Mounting App');
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
} else {
    console.error('root element not found');
}
