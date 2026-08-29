import { createRoot } from 'react-dom/client'
import { BrowserRouter } from "react-router-dom";
import { AuthorizationProvider } from "./context/auth.jsx";
import App from './app.jsx'

createRoot(document.querySelector('body')).render(
  <BrowserRouter>
    <AuthorizationProvider>
      <App />
    </AuthorizationProvider>
  </BrowserRouter>
)