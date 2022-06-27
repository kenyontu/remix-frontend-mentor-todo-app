import { useState, useEffect } from 'react'
import { json, redirect } from '@remix-run/node'
import { useLoaderData, useFetcher, useFetchers } from '@remix-run/react'
import cx from 'classnames'
import { useDebouncedCallback } from 'use-debounce'
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd'
import type {
  LoaderFunction,
  ActionFunction,
  LinksFunction,
  MetaFunction,
} from '@remix-run/node'
import type { Todo } from '@prisma/client'

import { getSessionUser } from '~/session.server'
import {
  getUserTodos,
  createTodo,
  deleteTodo,
  updateTodo,
  deleteComplete,
  moveTodoForwards,
  moveTodoBackwards,
} from '~/models/todo.server'

import styles from '~/styles/todos.css'
import { Header, links as headerLinks } from '~/components/layout/header'
import { TodoFilter, links as todoFilterLinks } from '~/components/todo-filter'
import type { Filter } from '~/components/todo-filter'
import { ActiveTodoCounter } from '~/components/active-todo-counter'

export const meta: MetaFunction = () => ({
  title: 'Todos',
})

export const links: LinksFunction = () => [
  ...headerLinks(),
  ...todoFilterLinks(),
  { rel: 'stylesheet', href: styles },
]

type LoaderData = {
  todos: Todo[]
}

type TodoBeingCreated = {
  operationId: number
  todoText: string
}

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getSessionUser(request)

  if (!user) return redirect('/')

  const todos = await getUserTodos(user.id)
  const response: LoaderData = {
    todos,
  }

  return json(response)
}

type SubmitAction =
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

export const action: ActionFunction = async ({ request }) => {
  const user = await getSessionUser(request)
  if (!user) return redirect('/')

  const formData = await request.formData()
  const action = Object.fromEntries(formData.entries()) as SubmitAction

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
        return await createTodo(user.id, action.text)

      case 'patchDone':
        return await updateTodo(parseInt(action.id), {
          completed: Boolean(action.completed),
        })

      case 'patchText':
        return await updateTodo(parseInt(action.id), {
          text: action.text,
        })

      case 'deleteTodo':
        return await deleteTodo(parseInt(action.id))

      case 'deleteComplete':
        return await deleteComplete(user.id)

      case 'patchMoveTodoForwards': {
        const result = await moveTodoForwards(
          user.id,
          parseInt(action.id),
          parseInt(action.position)
        )

        if (result) return new Response(null, { status: 204 })
        return {}
      }
      case 'patchMoveTodoBackwards': {
        const result = await moveTodoBackwards(
          user.id,
          parseInt(action.id),
          parseInt(action.position)
        )

        if (result) return new Response(null, { status: 204 })
        return {}
      }

      default:
        return {}
    }
  } catch (error) {
    console.error('Error while executing an action: ', error)
    return null
  }
}

export default function TodosPage() {
  const { todos } = useLoaderData<LoaderData>()
  const [filter, setFilter] = useState<Filter>('all')

  const [{ todosBeingCreated }, setTodosBeingCreated] = useState<{
    todosBeingCreated: TodoBeingCreated[]
    count: number
  }>({ todosBeingCreated: [], count: 0 })

  const clearCompleted = useFetcher()
  const changeTodoOrder = useFetcher()

  const optimisticTodos = useOptimisticTodos(todos)
  const { activeCount, completedCount, movingCount } =
    useTodoCounters(optimisticTodos)

  const showNoTodoMessage =
    filter === 'active'
      ? activeCount === 0 && todosBeingCreated.length === 0
      : filter === 'completed'
      ? completedCount === 0
      : activeCount + completedCount === 0 && todosBeingCreated.length === 0

  const isDragDisabled = todosBeingCreated.length > 0 || movingCount > 0

  return (
    <div className="container">
      <div className="background-image" />
      <Header />
      <main>
        <form
          autoComplete="off"
          onSubmit={(event) => {
            event.preventDefault()
            // In Remix, when a form is submitted, the request can be tracked
            // with useTransaction. It also gives you the submitted values
            // which we can use to implement optimistic UI. But currently it
            // only tracks the last made request.
            //
            // In my tests with an artificial delay on the server, if I were
            // to fire multiple submissions, tough all of them would complete
            // in the end, useTransaction would only give the submission data
            // of the last submitted request, making implementing optimistic
            // UI in this scenario impossible.
            //
            // My solution was to store the submissions and render a
            // component for each of them. These components have two
            // responsabilities:
            // - Make and track the actual submission
            // - Render the optimistic Todo while the the request is in
            //   progress
            //
            // And this is why we don't make the actual submission in
            // here.
            const formData = new FormData(event.currentTarget)
            const todoText = formData.get('text')

            // Do now allow creation of a todo without text
            if (typeof todoText !== 'string' || todoText.length === 0) {
              return
            }

            setTodosBeingCreated(({ todosBeingCreated, count }) => {
              return {
                todosBeingCreated: [
                  ...todosBeingCreated,
                  {
                    operationId: count,
                    todoText,
                  },
                ],
                count: count + 1,
              }
            })

            event.currentTarget.reset()
          }}
        >
          <label className="add-todo">
            <span className="check" />
            <input
              className="todo-description"
              type="text"
              name="text"
              placeholder="Create a new todo..."
            />
          </label>
        </form>

        <DragDropContext
          onDragEnd={(result) => {
            if (!result.destination) {
              return
            }

            if (result.source.index === result.destination.index) {
              return
            }

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
                {showNoTodoMessage && (
                  <div className="bottom-divider no-todos">
                    <p>No todos</p>
                  </div>
                )}
                {optimisticTodos.map((todo, index) => {
                  // With Remix, since we might have ongoing submissions in the
                  // TodoItem component, we cannot unmount it. What we do instead
                  // is hide the item so it is not visible to the user

                  const isHidden = todo.isDeleted
                    ? true
                    : filter === 'active'
                    ? todo.completed
                    : filter === 'completed'
                    ? !todo.completed
                    : false

                  return (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      dragDisabled={isDragDisabled}
                      hidden={isHidden}
                      index={index}
                    />
                  )
                })}
                {provided.placeholder}
                {todosBeingCreated.map((todoBeingCreated) => (
                  <TodoCreator
                    key={todoBeingCreated.operationId}
                    todo={todoBeingCreated}
                    hidden={filter === 'completed'}
                    onFinish={() =>
                      setTodosBeingCreated(({ todosBeingCreated, count }) => {
                        return {
                          todosBeingCreated: todosBeingCreated.filter(
                            (todo) =>
                              todo.operationId !== todoBeingCreated.operationId
                          ),
                          count,
                        }
                      })
                    }
                  />
                ))}
                <div className="bottom-bar">
                  <ActiveTodoCounter
                    className="bottom-text"
                    count={activeCount}
                  />

                  <TodoFilter
                    className="todo-filter"
                    filter={filter}
                    onFilterChange={setFilter}
                  />

                  <clearCompleted.Form method="delete">
                    <input
                      type="hidden"
                      name="_action"
                      value="deleteComplete"
                    />
                    <button
                      className="bottom-text clear-completed-btn"
                      type="submit"
                    >
                      Clear Completed
                    </button>
                  </clearCompleted.Form>
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
        <p className="drag-drop-msg">Drag and drop to reorder list</p>
      </main>
    </div>
  )
}

type TodoCreatorProps = {
  todo: TodoBeingCreated
  onFinish: () => void
  hidden?: boolean
}

/**
 * Component responsible for handling the create todo requests and showing
 * the optimistic version of these todos
 */
function TodoCreator({ todo, onFinish, hidden = false }: TodoCreatorProps) {
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
      // For now I won't be adding error handling, but I already give it some
      // thought and here is my initial approach:
      //
      // 1. Save the content of the error as state of this component
      // 2. If we have an error in the state, show the error message along
      //    options to retry or cancel the creation
      // 3. If the user chooses cancel, we can simply call onFinish and the
      //    submission will be cleared in the parent component
      onFinish()
    }
  }, [create, todo, onFinish])

  // On Firefox there is a less than one second window where both this
  // component and the actual todo that was created, are displayed at the
  // same time, causing a flicker. To avoid this,we also hide this todo
  // when the create request is done
  const isHidden = hidden || create.type === 'done'

  return (
    <TodoItem
      optimistic
      hidden={isHidden}
      index={0}
      todo={{
        id: todo.operationId,
        userId: 0,
        createdAt: new Date(Date.now()),
        text: todo.todoText,
        completed: false,
        order: 0,
      }}
    />
  )
}

type TodoItemProps = {
  todo: Todo
  optimistic?: boolean
  hidden?: boolean
  dragDisabled?: boolean
  index: number
}

function TodoItem({
  todo,
  optimistic = false,
  hidden = false,
  dragDisabled = false,
  index,
}: TodoItemProps) {
  const toggleFetcher = useFetcher()
  const descriptionFetcher = useFetcher()
  const deleteFetcher = useFetcher()

  const doneCheckboxId = `check-${todo.id}`

  // I was unable to set a debounced onChange and onInput in the form. It would
  // always result in a "TypeError: Could not parse content as FormData."
  //
  // The solution was to add it to the input directly and pass the form
  // data as a normal object
  const debouncedOnDescriptionChange = useDebouncedCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      descriptionFetcher.submit(
        {
          _action: 'patchText',
          id: todo.id.toString(),
          text: event.target.value,
        },
        { method: 'patch', replace: true }
      )
    },
    1000
  )

  const isCompleted = toggleFetcher.submission
    ? Boolean(toggleFetcher.submission.formData.get('completed'))
    : todo.completed

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
          className={cx('todo bottom-divider', {
            hidden: isDeleting || hidden,
            dragging: snapshot.isDragging,
          })}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          aria-label="Change todo order"
        >
          <toggleFetcher.Form className="check-form" method="patch" replace>
            <input type="hidden" name="_action" value="patchDone" />
            <input type="hidden" name="id" value={todo.id} />
            <input
              disabled={optimistic}
              type="checkbox"
              id={doneCheckboxId}
              name="completed"
              checked={isCompleted}
              onChange={(event) => toggleFetcher.submit(event.target.form)}
              aria-label="Toggle complete"
            />
            <label className="check" htmlFor={doneCheckboxId}></label>
          </toggleFetcher.Form>

          <descriptionFetcher.Form
            autoComplete="off"
            className="description-form"
          >
            <input
              disabled={optimistic}
              className={cx('todo-description', {
                completed: isCompleted,
              })}
              type="text"
              name="text"
              defaultValue={todo.text}
              onChange={debouncedOnDescriptionChange}
              aria-label="Todo text"
            />
          </descriptionFetcher.Form>

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

type OptimisticTodo = Todo & {
  isDeleted?: boolean
  isOptimistic?: boolean
}

/**
 * Takes the actual todos and apply the optimistic changes of ongoing todo
 * fetchers.
 *
 * @param todos An array containing the currently existing todos.
 *
 * @returns A list of todos with the optimistic changes applied.
 */
function useOptimisticTodos(todos: Todo[]) {
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

function useTodoCounters(todos: OptimisticTodo[]) {
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
