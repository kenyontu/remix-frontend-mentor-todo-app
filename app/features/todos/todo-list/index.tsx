import type { Todo } from '@prisma/client'
import { useFetcher } from '@remix-run/react'
import type { LinksFunction } from '@remix-run/node'
import { useState } from 'react'
import { DragDropContext, Droppable } from 'react-beautiful-dnd'

import styles from './styles.css'
import { TodoListItem, links as listItemLinks } from './todo-list-item'
import { useCreateTodoFetchers } from './use-create-todo-fetchers'
import { useOptimisticTodos } from './use-optimistic-todos'
import { useTodoCounters } from './use-todo-counters'
import type { SubmitAction, Filter } from '../types'
import {
  TodoListBottomBar,
  links as bottomBarLinks,
} from './todo-list-bottom-bar'

export const links: LinksFunction = () => [
  ...listItemLinks(),
  ...bottomBarLinks(),
  { rel: 'stylesheet', href: styles },
]

type Props = {
  todos: Todo[]
}

export function TodoList({ todos }: Props) {
  const changeTodoOrder = useFetcher()
  const optimisticTodos = useOptimisticTodos(todos)
  const createTodoFetchers = useCreateTodoFetchers(todos)
  const [filter, setFilter] = useState<Filter>('all')

  const { activeCount, movingCount } = useTodoCounters(optimisticTodos)

  const isDragDisabled = createTodoFetchers.length > 0 || movingCount > 0

  // The number of items that will be visible to the user. Controlls when
  // to show the empty list message
  let shownCount = 0

  const todoItems = optimisticTodos.map((todo, index) => {
    // With Remix, since we might have ongoing submissions in the
    // item component, we cannot unmount it. What we do instead
    // is hide the item so it is not visible to the user

    const isHidden = todo.isDeleted
      ? true
      : filter === 'active'
      ? todo.completed
      : filter === 'completed'
      ? !todo.completed
      : false

    if (!isHidden) shownCount++

    return (
      <TodoListItem
        key={todo.id}
        todo={todo}
        dragDisabled={isDragDisabled}
        hidden={isHidden}
        index={index}
      />
    )
  })

  const todosBeingCreated = createTodoFetchers.map((fetcher) => {
    const operationId = fetcher.submission!.formData.get(
      'operationId'
    ) as string

    const text = fetcher.submission!.formData.get('text') as string

    return (
      <TodoListItem
        key={operationId}
        optimistic
        hidden={filter === 'completed'}
        index={0}
        todo={{
          id: parseInt(operationId),
          userId: 0,
          createdAt: new Date(Date.now()),
          text,
          completed: false,
          order: 0,
        }}
      />
    )
  })

  if (filter !== 'completed') {
    shownCount += todosBeingCreated.length
  }

  return (
    <DragDropContext
      onDragEnd={(result) => {
        if (!result.destination) return

        if (result.source.index === result.destination.index) return

        const actionType =
          result.source.index > result.destination.index
            ? 'patchMoveTodoForwards'
            : 'patchMoveTodoBackwards'

        const action: SubmitAction = {
          _action: actionType,
          id: todos[result.source.index].id.toString(),
          position: todos[result.destination.index].order.toString(),
        }

        changeTodoOrder.submit(action, { method: 'patch', replace: true })
      }}
    >
      <Droppable droppableId="todos">
        {(provided) => (
          <div
            className="todo-list"
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {shownCount === 0 && (
              <div className="todo-list__empty">
                <p>No todos</p>
              </div>
            )}
            {todoItems}
            {todosBeingCreated}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <TodoListBottomBar
        activeCount={activeCount}
        filter={filter}
        onFilterChange={setFilter}
      />
    </DragDropContext>
  )
}
