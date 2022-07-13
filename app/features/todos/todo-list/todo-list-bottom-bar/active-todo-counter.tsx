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
      ? 'No items left'
      : count === 1
      ? '1 item left'
      : `${count} items left`

  return <span {...props}>{message}</span>
}

export { ActiveTodoCounter }
