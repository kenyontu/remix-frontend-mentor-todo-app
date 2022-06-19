import { redirect } from '@remix-run/node'
import type { LoaderFunction } from '@remix-run/node'

import { createVisitorSession, getSessionUser } from '~/session.server'

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getSessionUser(request)
  if (user) return redirect('/todos')

  return await createVisitorSession('/todos')
}
