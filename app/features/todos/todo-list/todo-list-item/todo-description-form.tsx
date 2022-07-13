import { useFetcher } from '@remix-run/react'
import cx from 'classnames'
import { useDebouncedCallback } from 'use-debounce'

type Props = {
  disabled?: boolean
  todoId: number
  description: string
  checked: boolean
}

export function TodoDescriptionForm({
  todoId,
  description,
  checked,
  disabled = false,
}: Props) {
  const descriptionFetcher = useFetcher()

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
          id: todoId.toString(),
          text: event.target.value,
        },
        { method: 'patch', replace: true }
      )
    },
    1000
  )

  return (
    <descriptionFetcher.Form
      autoComplete="off"
      className="todo-description-form"
    >
      <input
        disabled={disabled}
        className={cx('todo-description-form__input', {
          completed: checked,
        })}
        type="text"
        name="text"
        defaultValue={description}
        onChange={debouncedOnDescriptionChange}
        aria-label="Todo text"
      />
    </descriptionFetcher.Form>
  )
}
