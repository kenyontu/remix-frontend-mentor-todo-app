import { json, redirect } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import type {
  LoaderFunction,
  ActionFunction,
  LinksFunction,
  MetaFunction,
} from '@remix-run/node'
import type { Todo } from '@prisma/client'

import { getSessionUser } from '~/session.server'
import { getUserTodos } from '~/models/todo.server'
import styles from '~/styles/todos.css'
import { Header, links as headerLinks } from '~/components/layout/header'
import {
  CreateTodoForm,
  createTodoFormLinks,
  TodoList,
  todoListLinks,
} from '~/features/todos'
import { actionHandler } from '~/features/todos/action.server'
import type { SubmitAction } from '~/features/todos/types'

export const meta: MetaFunction = () => ({
  title: 'Todos',
})

export const links: LinksFunction = () => [
  ...headerLinks(),
  ...createTodoFormLinks(),
  ...todoListLinks(),
  { rel: 'stylesheet', href: styles },
]

type LoaderData = {
  todos: Todo[]
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

export const action: ActionFunction = async ({ request }) => {
  const user = await getSessionUser(request)
  if (!user) return redirect('/')

  const formData = await request.formData()
  const action = Object.fromEntries(formData.entries()) as SubmitAction

  return actionHandler(user, action)
}

export default function TodosPage() {
  const { todos } = useLoaderData<LoaderData>()

  return (
    <div className="container">
      <div className="background-image" />
      <Header />
      <main>
        <CreateTodoForm />
        <TodoList todos={todos} />
        <p className="drag-drop-msg">Drag and drop to reorder list</p>
      </main>
    </div>
  )
}
