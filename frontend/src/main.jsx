import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

// Bypass ngrok free tier browser warning interstitial for API calls
axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true'
const originalFetch = window.fetch
window.fetch = function (url, options = {}) {
  options.headers = {
    ...options.headers,
    'ngrok-skip-browser-warning': 'true',
  }
  return originalFetch(url, options)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
