import { useFetchers } from '@remix-run/react'
import type { Todo } from '@prisma/client'

import type { OptimisticTodo } from './types'

/**
 * Takes the actual todos and apply the optimistic changes of ongoing todo
 * fetchers.
 *
 * @param todos An array containing the currently existing todos.
 *
 * @returns A list of todos with the optimistic changes applied.
 */
export function useOptimisticTodos(todos: Todo[]) {
  const fetchers = useFetchers()

  let order = todos.map((todo) => todo.id)
  const map: Map<number, OptimisticTodo> = new Map()

  todos.forEach((todo) => {
    map.set(todo.id, todo)
  })

  fetchers.forEach((fetcher) => {
    if (!fetcher.submission) return

    const action = Object.fromEntries(
      fetcher.submission.formData.entries()
    ) as SubmitAction

    switch (action._action) {
      case 'deleteTodo': {
        const todoId = parseInt(action.id)
        if (map.has(todoId))
          map.set(todoId, {
            ...(map.get(todoId) as OptimisticTodo),
            isOptimistic: true,
            isDeleted: true,
          })
        break
      }

      case 'patchDone':
        const todoId = parseInt(action.id)
        if (map.has(todoId))
          map.set(todoId, {
            ...(map.get(todoId) as OptimisticTodo),
            completed: Boolean(action.completed),
            isOptimistic: true,
          })
        break

      case 'deleteComplete':
        map.forEach((value, key) => {
          if (value.completed)
            map.set(key, { ...value, isDeleted: true, isOptimistic: true })
        })
        break

      case 'patchMoveTodoForwards':
      case 'patchMoveTodoBackwards': {
        const todoId = parseInt(action.id)
        const position = parseInt(action.position)

        const oldIndex = order.indexOf(todoId)
        const newIndex = todos.findIndex((todo) => todo.order === position)

        order.splice(oldIndex, 1)
        order.splice(newIndex, 0, todoId)

        map.set(todoId, {
          ...(map.get(todoId) as OptimisticTodo),
          isOptimistic: true,
        })
        break
      }
    }
  })

  return order.map((todoId) => map.get(todoId)) as OptimisticTodo[]
}
