import type { ComponentProps } from 'react'
import type { LinksFunction } from '@remix-run/node'
import cx from 'classnames'

import styles from './styles.css'

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: styles }]

type Props = {
  filter: Filter
  onFilterChange: (filter: Filter) => void
} & ComponentProps<'div'>

function TodoFilter({ filter, onFilterChange, className, ...props }: Props) {
  return (
    <div className={cx('todo-filter', className)} {...props}>
      <div className="todo-filter__option">
        <input
          id="todo-filter-all"
          type="radio"
          checked={filter === 'all'}
          onChange={() => onFilterChange('all')}
        />
        <label htmlFor="todo-filter-all">All</label>
      </div>
      <div className="todo-filter__option">
        <input
          id="todo-filter-active"
          type="radio"
          checked={filter === 'active'}
          onChange={() => onFilterChange('active')}
        />
        <label htmlFor="todo-filter-active">Active</label>
      </div>
      <div className="todo-filter__option">
        <input
          id="todo-filter-completed"
          type="radio"
          checked={filter === 'completed'}
          onChange={() => onFilterChange('completed')}
        />
        <label htmlFor="todo-filter-completed">Completed</label>
      </div>
    </div>
  )
}

export { TodoFilter }

export type { Filter }
