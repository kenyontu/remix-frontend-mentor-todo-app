import { useState } from 'react'
import type { LinksFunction } from '@remix-run/node'

import styles from './styles.css'
import { TodoCreator } from './todo-creator'

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: styles }]

export type CreateTodoQueueItem = {
  operationId: number
  todoText: string
}

export function CreateTodoForm() {
  const [{ createTodoQueue }, setCreateTodoQueue] = useState<{
    createTodoQueue: CreateTodoQueueItem[]
    count: number
  }>({ createTodoQueue: [], count: 0 })

  return (
    <>
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

          setCreateTodoQueue(({ createTodoQueue, count }) => {
            return {
              createTodoQueue: [
                ...createTodoQueue,
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
        <label className="create-todo">
          <span className="create-todo__check" />
          <input
            className="todo-description-form__input"
            type="text"
            name="text"
            placeholder="Create a new todo..."
          />
        </label>
      </form>

      {/*
       * For each queued todo, we render a TodoCreator component, which is
       * responsible for submitting the request that creates the todo
       */}
      {createTodoQueue.map((queuedTodo) => (
        <TodoCreator
          key={queuedTodo.operationId}
          todo={queuedTodo}
          onFinish={() =>
            setCreateTodoQueue(({ createTodoQueue, count }) => {
              return {
                createTodoQueue: createTodoQueue.filter(
                  (todo) => todo.operationId !== queuedTodo.operationId
                ),
                count,
              }
            })
          }
        />
      ))}
    </>
  )
}
