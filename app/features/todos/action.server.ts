import type { User } from '@prisma/client'
import { json } from '@remix-run/node'

import {
  createTodo,
  deleteComplete,
  deleteTodo,
  moveTodoBackwards,
  moveTodoForwards,
  updateTodo,
} from '~/models/todo.server'
import type { SubmitAction } from './types'

export const actionHandler = (user: User, action: SubmitAction) => {
  try {
    switch (action._action) {
      case 'postTodo':
        if (action.text.length === 0) {
          return json(
            {
              error: { message: 'The "text" parameter cannot be empty' },
            },
            { status: 400 }
          )
        }
        return createTodo(user.id, action.text)

      case 'patchDone':
        return updateTodo(parseInt(action.id), {
          completed: Boolean(action.completed),
        })

      case 'patchText':
        return updateTodo(parseInt(action.id), {
          text: action.text,
        })

      case 'deleteTodo':
        return deleteTodo(parseInt(action.id))

      case 'deleteComplete':
        return deleteComplete(user.id)

      case 'patchMoveTodoForwards': {
        return moveTodoForwards(
          user.id,
          parseInt(action.id),
          parseInt(action.position)
        ).then((result) => (result ? new Response(null, { status: 204 }) : {}))
      }
      case 'patchMoveTodoBackwards': {
        return moveTodoBackwards(
          user.id,
          parseInt(action.id),
          parseInt(action.position)
        ).then((result) => (result ? new Response(null, { status: 204 }) : {}))
      }

      default:
        return {}
    }
  } catch (error) {
    console.error('Error while executing an action: ', error)
    return null
  }
}
