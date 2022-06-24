import type { Todo } from '@prisma/client'

import { prisma } from '~/db.server'

export type { Todo } from '@prisma/client'

export async function createTodo(userId: string, text: string) {
  // To avoid getting into a inconsistent state due to multiple concurrent
  // operations, we use a Interactive Transaction, which receives a function
  // and every operation called within this function is run in a single
  // transaction.
  //
  // You can read about them here: https://www.prisma.io/docs/concepts/components/prisma-client/transactions#interactive-transactions-in-preview
  return await prisma.$transaction(async (prisma) => {
    const userLastTodo = await prisma.userLastTodo.findUnique({
      where: { userId },
    })

    const newTodo = await prisma.todo.create({
      data: {
        text,
        previous: userLastTodo!.todoId,
        user: {
          connect: { id: userId },
        },
      },
    })

    await prisma.userLastTodo.update({
      where: { userId },
      data: {
        todoId: newTodo.id,
      },
    })

    return newTodo
  })
}

export async function getUserTodos(userId: string) {
  const todos: Todo[] = await prisma.todo.findMany({
    where: {
      userId,
    },
  })

  return todos
}

export async function updateTodo(
  todoId: string,
  todo: Partial<Omit<Todo, 'id' | 'createdAt' | 'previous'>>
) {
  return await prisma.todo.update({
    where: { id: todoId },
    data: todo,
  })
}

export async function deleteTodo(userId: string, todoId: string) {
  const todo = await prisma.todo.findFirst({ where: { id: todoId, userId } })

  if (!todo) return

  const transactions = []
  transactions.push(prisma.todo.delete({ where: { id: todoId } }))

  // If the todo being deleted is the last todo of an user, we need to set the
  // previous todo as the new last todo
  const userLastTodo = await prisma.userLastTodo.findFirst({
    where: { todoId: todo.id },
  })

  if (userLastTodo) {
    transactions.push(
      prisma.userLastTodo.update({
        where: { userId: userLastTodo.userId },
        data: { todoId: todo.previous },
      })
    )
  }

  // Update the next todo, which holds the reference to
  // the todo being deleted
  transactions.push(
    prisma.todo.updateMany({
      where: { previous: todoId },
      data: { previous: todo.previous },
    })
  )

  await prisma.$transaction(transactions)

  return todo
}

/**
 * Delete a user's completed todos
 *
 */
export async function deleteComplete(userId: string) {
  const todos = await prisma.todo.findMany({
    where: { userId, completed: true },
  })

  const deletedTodoIds: string[] = []
  for (let i = 0; i < todos.length; i++) {
    const deletedTodo = await deleteTodo(userId, todos[i].id)
    if (deletedTodo) deletedTodoIds.push(deletedTodo.id)
  }

  return deletedTodoIds
}

/**
 * Moves a todo to a position in front of another todo
 *
 * @param userId The user associated with the todo being moved, it is for
 * validation purposes
 * @param todoId The id of the todo to be moved
 * @param newNextTodoId The destination of the move will be in front of
 * the todo with this id
 *
 * @returns The updated todo
 */
export async function moveTodoForward(
  userId: string,
  todoId: string,
  newNextTodoId: string
) {
  const [todo, newNextTodo] = await prisma.$transaction([
    prisma.todo.findFirst({ where: { id: todoId, userId } }),
    prisma.todo.findFirst({ where: { id: newNextTodoId, userId } }),
  ])

  if (!todo || !newNextTodo) return

  const transactions = []

  // If the todo being moved is the last todo of an user, we need to set the
  // previous todo as the new last todo
  const userLastTodo = await prisma.userLastTodo
    .findFirst({
      where: { todoId },
    })
    // Silently catch if no record is found
    .catch((error) => {
      console.error(error)
      return null
    })

  if (userLastTodo) {
    transactions.push(
      prisma.userLastTodo.update({
        where: { userId: userLastTodo.userId },
        data: { todoId: todo.previous },
      })
    )
  } else {
    // If it isn't the last we need to update the next todo to point to the
    // previous of the previous todo
    transactions.push(
      prisma.todo.updateMany({
        where: { previous: todoId },
        data: { previous: todo.previous },
      })
    )
  }

  transactions.push(
    prisma.todo.update({
      where: { id: todoId },
      data: { previous: newNextTodo.previous },
    })
  )

  transactions.push(
    prisma.todo.update({
      where: { id: newNextTodo.id },
      data: { previous: todoId },
    })
  )

  try {
    const results = await prisma.$transaction(transactions)
    return results[1]
  } catch (error) {
    console.error(error)
    return null
  }
}

/**
 * Moves a todo to a backwards position, after a specified todo
 *
 * @param userId The user associated with the todo being moved, it is for
 * validation purposes
 * @param todoId The id of the todo to be moved
 * @param newPreviousTodoId The destination of the move will be after
 * the todo with this id
 *
 * @returns The updated todo
 */
export async function moveTodoBackwards(
  userId: string,
  todoId: string,
  newPreviousTodoId: string
) {
  const [todo, newPreviousTodo] = await prisma.$transaction([
    prisma.todo.findFirst({ where: { id: todoId, userId } }),
    prisma.todo.findFirst({ where: { id: newPreviousTodoId, userId } }),
  ])

  if (!todo || !newPreviousTodo) return

  const transactions = []

  // Check if the todo is being moved to the last position
  const userLastTodo = await prisma.userLastTodo
    .findFirst({
      where: { userId, todoId: newPreviousTodoId },
    })
    .catch((error) => {
      console.error(error)
      return null
    })

  // If it is being moved to the last position
  if (userLastTodo) {
    transactions.push(
      prisma.userLastTodo.update({
        where: { userId: userLastTodo.userId },
        data: { todoId },
      })
    )
  }

  transactions.push(
    prisma.todo.updateMany({
      where: {
        previous: todoId,
      },
      data: {
        previous: todo.previous,
      },
    })
  )

  if (!userLastTodo) {
    // We need to move our todo in-between the newPreviousTodo and
    // it's next todo. Here we make the later point to our todo
    transactions.push(
      prisma.todo.updateMany({
        where: {
          previous: newPreviousTodoId,
        },
        data: {
          previous: todoId,
        },
      })
    )
  }

  transactions.push(
    prisma.todo.update({
      where: {
        id: todoId,
      },
      data: {
        previous: newPreviousTodoId,
      },
    })
  )

  try {
    const results = await prisma.$transaction(transactions)
    return results[2]
  } catch (error) {
    console.error(error)
    return null
  }
}
