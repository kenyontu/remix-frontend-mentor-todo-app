import type { LinksFunction } from '@remix-run/node'
import { ClientOnly } from 'remix-utils'

import styles from './styles.css'
import {
  ThemeToggle,
  links as themeToggleLinks,
} from '~/components/theme-toggle'

export const links: LinksFunction = () => [
  ...themeToggleLinks(),
  { rel: 'stylesheet', href: styles },
]

function Header() {
  return (
    <header className="header">
      <h1 className="title">Todo</h1>
      <ClientOnly>{() => <ThemeToggle />}</ClientOnly>
    </header>
  )
}

export { Header }
