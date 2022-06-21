import type { ComponentProps } from 'react'

type Props = {
  count: number
} & ComponentProps<'span'>

/**
 * Renders the appropriate message for the number of active todos
 * left
 */
function ActiveTodoCounter({ count, ...props }: Props) {
  const message =
    count === 0
      ? 'No todo left'
      : count === 1
      ? '1 todo left'
      : `${count} todos left`

  return <span {...props}>{message}</span>
}

export { ActiveTodoCounter }
