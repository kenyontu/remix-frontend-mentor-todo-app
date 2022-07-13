import { useEffect } from 'react'
import { useFetcher } from '@remix-run/react'
import type { CreateTodoQueueItem } from './'

type Props = {
  todo: CreateTodoQueueItem
  onFinish: () => void
}

/**
 * Component responsible for handling the create todo requests and showing
 * the optimistic version of these todos
 */
export function TodoCreator({ todo, onFinish }: Props) {
  const create = useFetcher()

  useEffect(() => {
    // The type is 'init' when it still hasn't been used to make a submission
    // this is when we want to fire our submission
    if (create.type === 'init') {
      create.submit(
        {
          _action: 'postTodo',
          operationId: todo.operationId.toString(),
          text: todo.todoText,
        },
        { method: 'post', replace: true }
      )
    }

    // 'done' means that the request finished
    if (create.type === 'done') {
      onFinish()
    }
  }, [create, todo, onFinish])

  return null
}
