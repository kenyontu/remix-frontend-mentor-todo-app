import type { User } from '@prisma/client'
import { prisma } from '~/db.server'

export type { User } from '@prisma/client'

export async function createUser() {
  const newUser = await prisma.user.create({
    data: {},
  })

  return { id: newUser.id }
}

export async function getUserById(id: User['id']) {
  return prisma.user.findUnique({ where: { id } })
}
