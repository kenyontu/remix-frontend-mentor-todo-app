import { useFetcher } from '@remix-run/react'
import type { LinksFunction } from '@remix-run/node'

import styles from './styles.css'
import { ActiveTodoCounter } from './active-todo-counter'
import { TodoFilter } from './todo-filter'
import type { Filter } from '../../types'

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: styles }]

type Props = {
  activeCount: number
  filter: Filter
  onFilterChange: (filter: Filter) => void
}

export function TodoListBottomBar({
  activeCount,
  filter,
  onFilterChange,
}: Props) {
  const clearCompleted = useFetcher()

  return (
    <div className="bottom-bar">
      <ActiveTodoCounter className="bottom-text" count={activeCount} />

      <TodoFilter
        className="todo-filter"
        filter={filter}
        onFilterChange={onFilterChange}
      />

      <clearCompleted.Form method="delete">
        <input type="hidden" name="_action" value="deleteComplete" />
        <button className="bottom-text clear-completed-btn" type="submit">
          Clear Completed
        </button>
      </clearCompleted.Form>
    </div>
  )
}
