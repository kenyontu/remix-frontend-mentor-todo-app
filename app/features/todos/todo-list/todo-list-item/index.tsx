import { useFetcher } from '@remix-run/react'
import { Draggable } from 'react-beautiful-dnd'
import cx from 'classnames'
import type { Todo } from '@prisma/client'
import type { LinksFunction } from '@remix-run/node'

import styles from './styles.css'
import { TodoCheckForm } from './todo-check-form'
import { TodoDescriptionForm } from './todo-description-form'

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: styles }]

type Props = {
  todo: Todo
  optimistic?: boolean
  hidden?: boolean
  dragDisabled?: boolean
  index: number
}

export function TodoListItem({
  todo,
  optimistic = false,
  hidden = false,
  dragDisabled = false,
  index,
}: Props) {
  const deleteFetcher = useFetcher()

  const isDeleting =
    deleteFetcher.submission?.formData.get('id') === todo.id.toString()

  return (
    <Draggable
      draggableId={todo.id.toString()}
      index={index}
      isDragDisabled={dragDisabled || optimistic || hidden}
    >
      {(provided, snapshot) => (
        <div
          className={cx('todo todo__bottom-divider', {
            hidden: isDeleting || hidden,
            dragging: snapshot.isDragging,
          })}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          aria-label="Change todo order"
        >
          <TodoCheckForm
            todoId={todo.id}
            checked={todo.completed}
            disabled={optimistic}
          />

          <TodoDescriptionForm
            todoId={todo.id}
            checked={todo.completed}
            description={todo.text}
            disabled={optimistic}
          />

          <deleteFetcher.Form method="delete">
            <input type="hidden" name="id" defaultValue={todo.id} />
            <button
              disabled={isDeleting || optimistic}
              className="todo-delete-btn"
              type="submit"
              name="_action"
              value="deleteTodo"
              aria-label="Delete todo"
            >
              <img src="/images/icon-cross.svg" alt="Delete" />
            </button>
          </deleteFetcher.Form>
        </div>
      )}
    </Draggable>
  )
}
