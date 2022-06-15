import type { Todo } from '@prisma/client'

import { prisma } from '~/db.server'
import {
  createOrUpdateLastTodo,
  getUserLastTodoByUserId,
} from './user-last-todo.server'

export type { Todo } from '@prisma/client'

export type NewTodo = Omit<Todo, 'id' | 'createdAt' | 'previous'>

export async function createTodo(userId: string, todo: NewTodo) {
  const userLastTodo = await getUserLastTodoByUserId(userId)

  const newTodo = await prisma.todo.create({
    data: { ...todo, previous: userLastTodo?.todoId ?? null },
  })

  await createOrUpdateLastTodo(userId, newTodo.id)

  return newTodo
}

export async function getUserTodos(userId: string) {
  const todos: Todo[] = await prisma.todo.findMany({
    where: {
      userId,
    },
  })

  return todos
}

export async function updateTodo(todoId: string, todo: Partial<NewTodo>) {
  return await prisma.todo.update({ where: { id: todoId }, data: todo })
}

export async function deleteTodo(todoId: string) {
  const todo = await prisma.todo
    .delete({ where: { id: todoId } })
    .catch((error) => console.error(error))

  if (!todo) return

  // If the todo being deleted is the last todo of an user, we need to set the
  // previous todo as the new last todo
  const userLastTodo = await prisma.userLastTodo.findFirst({
    where: { todoId: todo.id },
  })
  if (userLastTodo) {
    await prisma.userLastTodo.update({
      where: { userId: userLastTodo.userId },
      data: { todoId: todo.previous },
    })
  }

  // Update the next todo, which holds the reference to
  // the todo being deleted
  await prisma.todo
    .updateMany({
      where: { previous: todoId },
      data: { previous: todo.previous },
    })
    // If the todo being deleted is the last todo, this update will throw, so
    // we silently catch it here
    .catch((error) => console.error(error))

  return todo
}

export async function deleteDone(userId: string) {
  const todos = await prisma.todo.findMany({
    where: { userId, completed: true },
  })

  const deletedTodos = []
  for (let i = 0; i < todos.length; i++) {
    deletedTodos.push(await deleteTodo(todos[i].id))
  }

  return deletedTodos
}
