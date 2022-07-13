import type { Todo } from '@prisma/client'

export type Filter = 'all' | 'active' | 'completed'

export type OptimisticTodo = Todo & {
  isDeleted?: boolean
  isOptimistic?: boolean
}

export type SubmitAction =
  | {
      _action: 'postTodo'
      text: string
    }
  | {
      _action: 'patchDone'
      id: string
      completed: string
    }
  | {
      _action: 'patchText'
      id: string
      text: string
    }
  | {
      _action: 'deleteTodo'
      id: string
    }
  | {
      _action: 'deleteComplete'
    }
  | {
      _action: 'patchMoveTodoForwards'
      id: string
      position: string
    }
  | {
      _action: 'patchMoveTodoBackwards'
      id: string
      position: string
    }
