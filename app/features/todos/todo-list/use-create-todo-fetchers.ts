import { useFetchers } from '@remix-run/react'
import type { Todo } from '@prisma/client'

export function useCreateTodoFetchers(todos: Todo[]) {
  const fetchers = useFetchers()

  // We create a map with the existing todo ids and filter out fetchers that
  // have already finished submitting and the created todo already downloaded.
  //
  // This ensures that we don't show the actual todo and its optimistic
  // couterpart at the same time.
  const map = new Map<number, boolean>()
  todos.forEach((todo) => map.set(todo.id, true))

  return fetchers.filter((fetcher) => {
    if (fetcher.submission?.formData.get('_action') !== 'postTodo') return false

    if (fetcher.data && map.has(fetcher.data.id)) return false

    return true
  })
}
