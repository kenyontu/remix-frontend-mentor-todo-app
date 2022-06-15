import { prisma } from '~/db.server'

export type { UserLastTodo } from '@prisma/client'

export async function createOrUpdateLastTodo(userId: string, todoId: string) {
  return await prisma.userLastTodo.upsert({
    create: { userId, todoId },
    update: { todoId },
    where: { userId },
  })
}

export async function getUserLastTodoByUserId(userId: string) {
  return await prisma.userLastTodo.findUnique({ where: { userId } })
}
