import { createRoot } from 'react-dom/client'
import { BrowserRouter } from "react-router-dom";
import App from './app.jsx'

createRoot(document.querySelector('body')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
