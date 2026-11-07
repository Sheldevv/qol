import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ToastProvider } from './components/Toast'
import { ThemeProvider } from './components/ThemeContext'
import { migrate } from './store'
import './index.css'

// Ensure migration runs BEFORE any component reads from localStorage
migrate();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);