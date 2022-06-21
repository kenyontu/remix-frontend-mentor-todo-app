import { prisma } from '~/db.server'

export type { UserLastTodo } from '@prisma/client'

export async function updateUserLastTodo(userId: string, todoId: string) {
  return await prisma.userLastTodo.update({
    data: { todoId },
    where: { userId },
  })
}

export async function getUserLastTodoByUserId(userId: string) {
  return await prisma.userLastTodo.findUnique({ where: { userId } })
}
