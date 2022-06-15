import { createCookieSessionStorage, redirect } from '@remix-run/node'
import { createThemeSessionResolver } from 'remix-themes'

import { createUser, getUserById } from '~/models/user.server'

const sessionSecret = process.env.SESSION_SECRET
if (!sessionSecret) {
  throw new Error('The SESSION_SECRET environment variable is not set')
}

const storage = createCookieSessionStorage({
  cookie: {
    name: 'session',
    secure: process.env.NODE_ENV === 'production',
    secrets: [sessionSecret],
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
    httpOnly: true,
  },
})

export const themeSessionResolver = createThemeSessionResolver(storage)

const USER_SESSION_KEY = 'userId'

export async function createVisitorSession(redirectTo: string) {
  const newUser = await createUser()

  const session = await storage.getSession()
  session.set(USER_SESSION_KEY, newUser.id)

  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await storage.commitSession(session),
    },
  })
}

async function getSession(request: Request) {
  return await storage.getSession(request.headers.get('Cookie'))
}

export async function getUserId(request: Request) {
  const session = await getSession(request)
  return session.get(USER_SESSION_KEY)
}

export async function getSessionUser(request: Request) {
  const userId = await getUserId(request)
  if (userId) {
    const user = await getUserById(userId)
    if (user) {
      return user
    }
  }

  return null
}
