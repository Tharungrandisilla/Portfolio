import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'

// StrictMode is intentionally omitted: React Three Fiber v9 logs spurious
// "unmount a root while rendering" errors in dev when its Canvas double-mounts.
createRoot(document.getElementById('root')!).render(<App />)
