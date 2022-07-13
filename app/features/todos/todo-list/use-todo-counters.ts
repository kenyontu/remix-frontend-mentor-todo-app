import { useFetchers } from '@remix-run/react'

import type { OptimisticTodo } from './types'

export function useTodoCounters(todos: OptimisticTodo[]) {
  const fetchers = useFetchers()

  let activeCount = 0
  let completedCount = 0
  let movingCount = 0

  for (let i = 0; i < todos.length; i++) {
    if (todos[i].isDeleted) continue

    if (todos[i].completed) {
      completedCount++
      continue
    }

    activeCount++
  }

  // Also take into account the todos being created
  for (let i = 0; i < fetchers.length; i++) {
    const action = fetchers[i].submission?.formData.get('_action')
    if (action === 'postTodo') {
      activeCount++
    } else if (
      action === 'patchMoveTodoBackwards' ||
      action === 'patchMoveTodoForward'
    ) {
      movingCount++
    }
  }

  return {
    activeCount,
    completedCount,
    movingCount,
  }
}
