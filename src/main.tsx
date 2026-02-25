import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { DataProvider } from './context/DataContext'
import { LanguageProvider } from './context/LanguageContext'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <LanguageProvider>
            <DataProvider>
              <App />
            </DataProvider>
          </LanguageProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  )
} catch (e) {
  document.getElementById('root')!.innerHTML = `
    <div style="padding:2rem;font-family:sans-serif;text-align:center">
      <h1 style="color:#c00">Failed to load</h1>
      <pre style="text-align:left;background:#f5f5f5;padding:1rem;border-radius:8px;overflow:auto;max-width:600px;margin:1rem auto">${e}</pre>
      <button onclick="location.reload()" style="margin-top:1rem;padding:8px 20px;background:#f97316;color:#fff;border:none;border-radius:8px;cursor:pointer">Reload</button>
    </div>
  `
}
