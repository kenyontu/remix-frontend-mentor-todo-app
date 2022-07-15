import { useFetcher } from '@remix-run/react'

type Props = {
  todoId: number
  checked: boolean
  disabled?: boolean
}

export function TodoCheckForm({ todoId, checked, disabled = false }: Props) {
  const toggleFetcher = useFetcher()

  const isCompleted = toggleFetcher.submission
    ? Boolean(toggleFetcher.submission.formData.get('completed'))
    : checked

  const id = `check-${todoId}`

  return (
    <toggleFetcher.Form className="todo-check-form" method="patch" replace>
      <input type="hidden" name="_action" value="patchDone" />
      <input type="hidden" name="id" value={todoId} />
      <input
        className="todo-check-form__input"
        disabled={disabled}
        type="checkbox"
        id={id}
        name="completed"
        checked={isCompleted}
        onChange={(event) => toggleFetcher.submit(event.target.form)}
      />
      <label className="todo-check-form__check" htmlFor={id}>
        <span className="sr-only">Toggle complete</span>
      </label>
    </toggleFetcher.Form>
  )
}
