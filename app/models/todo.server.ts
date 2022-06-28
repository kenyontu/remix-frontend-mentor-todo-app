import type { Todo } from '@prisma/client'

import { prisma } from '~/db.server'

export type { Todo } from '@prisma/client'

const maxTries = 3

async function autoRetry<T = {}>(execute: () => Promise<T>) {
  let attempts = 0
  while (attempts < maxTries) {
    try {
      return await execute()
    } catch (error) {
      console.error(error)
      attempts++
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }
  return null
}

export async function createTodo(userId: number, text: string) {
  const result = await autoRetry(async () => {
    const lastOrder = await prisma.todo.findFirst({
      where: { userId },
      orderBy: { order: 'desc' },
    })

    // We have a unique contraint set on the database with the columns userId
    // and order, so in case of a race condition where the value of lastOrder
    // is the same for two operations, one of them will fail and retry
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

  return result ?? null
}

export async function getUserTodos(userId: number) {
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
  todoId: number,
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

export async function deleteTodo(todoId: number) {
  const result = await autoRetry(async () => {
    const deletedTodo = await prisma.todo.delete({ where: { id: todoId } })
    return deletedTodo.id
  })

  return result ?? null
}

export async function deleteComplete(userId: number) {
  const result = await autoRetry(async () => {
    return await prisma.todo.deleteMany({
      where: { userId, completed: true },
    })
  })

  return result ?? null
}

export async function moveTodoForwards(
  userId: number,
  todoId: number,
  position: number
) {
  const result = await autoRetry(async () => {
    const transactions = [
      prisma.todo.updateMany({
        where: { userId, order: { gte: position } },
        data: { order: { increment: 1 } },
      }),
      prisma.todo.update({ where: { id: todoId }, data: { order: position } }),
    ]

    await prisma.$transaction(transactions)
    return true
  })

  return result ?? null
}

export async function moveTodoBackwards(
  userId: number,
  todoId: number,
  position: number
) {
  const result = await autoRetry(async () => {
    const transactions = [
      prisma.todo.updateMany({
        where: { userId, order: { lte: position } },
        data: { order: { decrement: 1 } },
      }),
      prisma.todo.update({ where: { id: todoId }, data: { order: position } }),
    ]

    await prisma.$transaction(transactions)
    return true
  })

  return result ?? null
}
