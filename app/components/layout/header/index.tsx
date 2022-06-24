import type { LinksFunction } from '@remix-run/node'
import { ClientOnly } from 'remix-utils'
import cx from 'classnames'

import styles from './styles.css'
import {
  ThemeToggle,
  links as themeToggleLinks,
} from '~/components/theme-toggle'
import { useFetchers } from '@remix-run/react'

export const links: LinksFunction = () => [
  ...themeToggleLinks(),
  { rel: 'stylesheet', href: styles },
]

function Header() {
  const hasOngoingAction = useHasOngoingAction()

  return (
    <header className="header">
      <h1 className={cx('title', { loading: hasOngoingAction })}>Todo</h1>
      <ClientOnly>{() => <ThemeToggle />}</ClientOnly>
    </header>
  )
}

function useHasOngoingAction() {
  const fetchers = useFetchers()

  for (let i = 0; i < fetchers.length; i++) {
    if (fetchers[i].submission) return true
  }

  return false
}

export { Header }
