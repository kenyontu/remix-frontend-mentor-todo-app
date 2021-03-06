import { useState, useEffect } from 'react'
import type {
  MetaFunction,
  LinksFunction,
  LoaderFunction,
} from '@remix-run/node'
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from '@remix-run/react'
import { ThemeProvider, useTheme, PreventFlashOnWrongTheme } from 'remix-themes'

import globalStyles from '~/styles/global.css'
import { themeSessionResolver } from '~/session.server'

export const meta: MetaFunction = () => ({
  charset: 'utf-8',
  title: 'Frontend Mentor | Todo App',
  description: 'Frontend Mentor solution for the Todo App challenge.',
  viewport: 'width=device-width,initial-scale=1',
})

export const links: LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    href: 'https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@400;700&display=swap',
    rel: 'stylesheet',
  },
  { rel: 'stylesheet', href: globalStyles },
  { rel: 'icon', href: 'favicon.png' },
]

export const loader: LoaderFunction = async ({ request }) => {
  const { getTheme } = await themeSessionResolver(request)

  return { theme: getTheme() }
}

function App() {
  const data = useLoaderData()
  const [theme] = useTheme()
  const [isWebpSupported, setIsWebpSupported] = useState(true)

  useEffect(() => {
    if (window.Modernizr) {
      window.Modernizr.on('webp', (result) => {
        if (!result) setIsWebpSupported(false)
      })
    }
  }, [])

  return (
    <html
      lang="en"
      className={`${theme ?? ''}${!isWebpSupported ? ' no-webp' : ''}`}
    >
      <head>
        <Meta />
        <PreventFlashOnWrongTheme ssrTheme={Boolean(data.theme)} />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <script src="scripts/vendor/modernizr.js" />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  )
}

export default function AppWithProviders() {
  const data = useLoaderData()
  return (
    <ThemeProvider specifiedTheme={data.theme} themeAction="action/set-theme">
      <App />
    </ThemeProvider>
  )
}
