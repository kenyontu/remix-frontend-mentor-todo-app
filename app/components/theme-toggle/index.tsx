import type { LinksFunction } from '@remix-run/node'
import { Theme, useTheme } from 'remix-themes'

import styles from './styles.css'

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: styles }]

function ThemeToggle() {
  const [theme, setTheme] = useTheme()

  return (
    <button
      className="toggle-theme-btn"
      onClick={() =>
        setTheme((theme) => (theme === Theme.DARK ? Theme.LIGHT : Theme.DARK))
      }
    >
      <img
        src={
          theme === Theme.LIGHT
            ? '/images/icon-moon.svg'
            : '/images/icon-sun.svg'
        }
        alt="Toggle theme"
      />
    </button>
  )
}

export { ThemeToggle }
