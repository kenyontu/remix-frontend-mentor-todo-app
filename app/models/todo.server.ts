import type { Todo } from '@prisma/client'

import { prisma } from '~/db.server'

export type { Todo } from '@prisma/client'

const maxTries = 3

async function autoRetry<T = {}>(execute: () => Promise<T>) {
  let attempts = 0
  while (attempts < maxTries) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 50))
      return await execute()
    } catch (error) {
      console.error(error)
      attempts++
    }
  }
  return null
}

export async function createTodo(userId: string, text: string) {
  const result = await autoRetry(async () => {
    return prisma.$transaction(async (prisma) => {
      const lastOrder = await prisma.todo.findFirst({
        where: { userId },
        orderBy: { order: 'desc' },
      })

      return await prisma.todo.create({
        data: {
          text,
          order: lastOrder ? lastOrder.order + 1 : 1,
          user: {
            connect: { id: userId },
          },
        },
      })
    })
  })

  return result ?? null
}

export async function getUserTodos(userId: string) {
  const result = await autoRetry(async () => {
    return await prisma.todo.findMany({
      where: {
        userId,
      },
      orderBy: {
        order: 'asc',
      },
    })
  })

  return Array.isArray(result) ? result : []
}

export async function updateTodo(
  todoId: string,
  todo: Partial<Omit<Todo, 'id' | 'createdAt' | 'previous'>>
) {
  const result = await autoRetry(async () => {
    return await prisma.todo.update({
      where: { id: todoId },
      data: todo,
    })
  })

  return result ?? null
}

export async function deleteTodo(todoId: string) {
  const result = await autoRetry(async () => {
    const deletedTodo = await prisma.todo.delete({ where: { id: todoId } })
    return deletedTodo.id
  })

  return result ?? null
}

export async function deleteComplete(userId: string) {
  const result = await autoRetry(async () => {
    return await prisma.todo.deleteMany({
      where: { userId, completed: true },
    })
  })

  return result ?? null
}

export async function moveTodoForwards(
  userId: string,
  todoId: string,
  position: number
) {
  const result = await autoRetry(async () => {
    await prisma.$transaction(async (prisma) => {
      await prisma.todo.updateMany({
        where: { userId, order: { gte: position } },
        data: { order: { increment: 1 } },
      })

      await prisma.todo.update({
        where: { id: todoId },
        data: { order: position },
      })
    })
    return true
  })

  return result ?? null
}

export async function moveTodoBackwards(
  userId: string,
  todoId: string,
  position: number
) {
  const result = await autoRetry(async () => {
    await prisma.$transaction(async (prisma) => {
      await prisma.todo.updateMany({
        where: { userId, order: { lte: position } },
        data: { order: { decrement: 1 } },
      })

      await prisma.todo.update({
        where: { id: todoId },
        data: { order: position },
      })
    })
    return true
  })

  return result ?? null
}
