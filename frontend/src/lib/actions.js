import { createContext, useCallback, useContext } from 'react'
import { useSearchParams } from 'react-router-dom'

/** Global actions provided by the Layout: open new-task form, quick capture, etc. */
export const ActionsContext = createContext({
  newTask: () => {},
  organizeCapture: () => {},
  quickCapture: () => {},
  search: () => {},
})

export const useActions = () => useContext(ActionsContext)

/** Open the task drawer from anywhere (it lives in the URL as ?task=ID). */
export function useOpenTask() {
  const [params, setParams] = useSearchParams()
  return useCallback(
    (id) => {
      const next = new URLSearchParams(params)
      next.set('task', id)
      setParams(next)
    },
    [params, setParams],
  )
}
