import { createRoot } from 'react-dom/client'
import App from './App'
import SettingsApp from './settings/SettingsApp'

const isSettings = window.location.hash.includes('/settings')

createRoot(document.getElementById('root')!).render(
  isSettings ? <SettingsApp /> : <App />,
)
