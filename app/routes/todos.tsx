import { useState, useEffect, useMemo } from 'react'
import { json, redirect } from '@remix-run/node'
import { useLoaderData, useFetcher, useFetchers } from '@remix-run/react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { nanoid } from 'nanoid'
import cx from 'classnames'
import { useDebouncedCallback } from 'use-debounce'
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
  deleteDone,
} from '~/models/todo.server'
import type { NewTodo } from '~/models/todo.server'

import styles from '~/styles/todos.css'
import { Header, links as headerLinks } from '~/components/layout/header'
import { TodoFilter, links as todoFilterLinks } from '~/components/todo-filter'
import type { Filter } from '~/components/todo-filter'
import { getUserLastTodoByUserId } from '~/models/user-last-todo.server'

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
  lastTodoId: string | null
}

type TodoBeingCreated = {
  operationId: string
  todoText: string
}

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getSessionUser(request)

  if (!user) return redirect('/')

  const todos = await getUserTodos(user.id)
  const userLastTodo = await getUserLastTodoByUserId(user.id)
  const response: LoaderData = {
    todos,
    lastTodoId: userLastTodo?.todoId ?? null,
  }

  return json(response)
}

type Action =
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
      _action: 'deleteDone'
    }
  | {
      _action: 'changeTodoOrder'
      id: string
      previousId: string
    }

export const action: ActionFunction = async ({ request }) => {
  const user = await getSessionUser(request)
  if (!user) return redirect('/')

  const formData = await request.formData()
  const action = Object.fromEntries(formData.entries()) as Action

  switch (action._action) {
    case 'postTodo':
      const todo: NewTodo = {
        userId: user.id,
        text: action.text,
        completed: formData.has('completed'),
      }
      return await createTodo(user.id, todo)

    case 'patchDone':
      return await updateTodo(action.id, {
        completed: Boolean(action.completed),
      })

    case 'patchText':
      return await updateTodo(action.id, {
        text: action.text,
      })

    case 'deleteTodo':
      return await deleteTodo(action.id)

    case 'deleteDone':
      return await deleteDone(user.id)
  }
}

export default function TodosPage() {
  const { todos, lastTodoId } = useLoaderData<LoaderData>()
  const [filter, setFilter] = useState<Filter>('all')
  const [todosBeingCreated, setTodosBeingCreated] = useState<
    TodoBeingCreated[]
  >([])
  const clearCompleted = useFetcher()

  const orderedTodos = useOrderedTodos(todos, lastTodoId)
  const optimisticTodos = useOptimisticTodos(orderedTodos)
  const { activeCount, completedCount } = useTodoCounters(optimisticTodos)

  const showNoTodoMessage =
    filter === 'active'
      ? activeCount === 0 && todosBeingCreated.length === 0
      : filter === 'completed'
      ? completedCount === 0
      : activeCount + completedCount === 0 && todosBeingCreated.length === 0

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="container">
        <div className="background-image" />
        <Header />
        <main>
          <form
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

              setTodosBeingCreated((todosBeingCreated) => [
                ...todosBeingCreated,
                {
                  operationId: nanoid(),
                  todoText: formData.get('text') as string,
                },
              ])

              event.currentTarget.reset()
            }}
          >
            <label className="todo">
              <span className="check" />
              <input
                className="todo-description"
                type="text"
                name="text"
                placeholder="Create a new todo..."
              />
            </label>
          </form>
          <div className="todo-list">
            {showNoTodoMessage && (
              <div className="bottom-divider no-todos">
                <p>No todos</p>
              </div>
            )}
            {orderedTodos.map((todo, index) => {
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

              return <TodoItem key={todo.id} todo={todo} hidden={isHidden} />
            })}
            {todosBeingCreated.map((todoBeingCreated) => (
              <TodoCreator
                key={todoBeingCreated.operationId}
                todo={todoBeingCreated}
                hidden={filter === 'completed'}
                onFinish={() =>
                  setTodosBeingCreated(
                    todosBeingCreated.filter(
                      (todo) =>
                        todo.operationId !== todoBeingCreated.operationId
                    )
                  )
                }
              />
            ))}
            <div className="bottom-bar">
              <span className="bottom-text">{`${activeCount} items left`}</span>

              <TodoFilter
                className="todo-filter"
                filter={filter}
                onFilterChange={setFilter}
              />

              <clearCompleted.Form method="delete">
                <input type="hidden" name="_action" value="deleteDone" />
                <button
                  className="bottom-text clear-completed-btn"
                  type="submit"
                >
                  Clear Completed
                </button>
              </clearCompleted.Form>
            </div>
          </div>
        </main>
      </div>
    </DndProvider>
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
          operationId: todo.operationId,
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

  return (
    <TodoItem
      optimistic
      hidden={hidden}
      todo={{
        id: '',
        previous: null,
        userId: '',
        createdAt: new Date(Date.now()),
        text: todo.todoText,
        completed: false,
      }}
    />
  )
}

type TodoItemProps = {
  todo: Todo
  optimistic?: boolean
  hidden?: boolean
}

function TodoItem({ todo, optimistic = false, hidden = false }: TodoItemProps) {
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
          id: todo.id,
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

  const isDeleting = deleteFetcher.submission?.formData.get('id') === todo.id

  return (
    <div
      className={cx('todo bottom-divider', { hidden: isDeleting || hidden })}
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
        />
        <label className="check" htmlFor={doneCheckboxId}></label>
      </toggleFetcher.Form>

      <descriptionFetcher.Form className="description-form">
        <input
          disabled={optimistic}
          className={cx('todo-description', {
            completed: isCompleted,
          })}
          type="text"
          name="text"
          defaultValue={todo.text}
          onChange={debouncedOnDescriptionChange}
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
  )
}

/**
 * Hook to restore the user-defined order of the todos
 *
 * Since the todos are stored as a linked-list, we need this hook to recreate
 * the order defined by the pointers of the linked-list items.
 *
 * @param todos - The list of todos
 *
 * @param lastTodoId - The id of the last todo in linked-list
 *
 * @returns A memoized list of todos in the user-defined order
 */
export function useOrderedTodos(todos: Todo[], lastTodoId: string | null) {
  const orderedTodos = useMemo(() => {
    if (todos.length === 0 || lastTodoId === null) return []

    // Convert the array of todos into a map where the todo's id is the key and
    // the todo is the value
    const todosMap = new Map<string, Todo>()
    todos.forEach((todo) => todosMap.set(todo.id, todo))

    // Since we have a linked-list that goes backwards, where each element
    // has the id of the previous element. We initialize an array with the
    // same size as our array of todos and then, while iterating through the
    // linked-list, we fill our result array from the last to the first element
    const result = new Array(todos.length)
    let i = todos.length - 1
    let current = todosMap.get(lastTodoId)

    result[i] = current

    while (current?.previous) {
      current = result[--i] = todosMap.get(current.previous)
    }

    return result
  }, [todos, lastTodoId])

  return orderedTodos
}

type OptimisticTodo = Todo & {
  isDeleted?: boolean
  isOptimistic?: boolean
}

/**
 * Consolidates part of the todos state and the optimistic values of ongoing
 * fetchers into a map, making it easier to query the optimistic value of a
 * todo
 *
 * @param todos An array containing the currently existing todos
 *
 * @returns A map with the optimistic values of each todo
 */
function useOptimisticTodos(todos: Todo[]) {
  const fetchers = useFetchers()

  const map: Map<string, OptimisticTodo> = new Map()

  todos.forEach((todo) => {
    map.set(todo.id, todo)
  })

  fetchers.forEach((fetcher) => {
    if (!fetcher.submission) return

    const action = Object.fromEntries(
      fetcher.submission.formData.entries()
    ) as Action

    switch (action._action) {
      case 'deleteTodo':
        if (map.has(action.id))
          map.set(action.id, {
            ...(map.get(action.id) as OptimisticTodo),
            isOptimistic: true,
            isDeleted: true,
          })
        break

      case 'patchDone':
        if (map.has(action.id))
          map.set(action.id, {
            ...(map.get(action.id) as OptimisticTodo),
            completed: Boolean(action.completed),
            isOptimistic: true,
          })
        break

      case 'deleteDone':
        map.forEach((value, key) => {
          if (value.completed)
            map.set(key, { ...value, isDeleted: true, isOptimistic: true })
        })
        break
    }
  })

  return Array.from(map.values())
}

function useTodoCounters(todos: OptimisticTodo[]) {
  let activeCount = 0

  for (let i = 0; i < todos.length; i++) {
    if (todos[i].isDeleted || todos[i].completed) continue

    activeCount++
  }

  return {
    activeCount,
    completedCount: todos.length - activeCount,
  }
}
