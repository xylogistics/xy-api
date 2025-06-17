export default ({ delayMS = 1000 } = {}) => {
  const handles = new Map()
  const api = {
    enqueue: (key, fn) => {
      if (handles.has(key)) clearTimeout(handles.get(key))
      handles.set(
        key,
        setTimeout(() => {
          handles.delete(key)
          fn()
        }, delayMS)
      )
    },
    cancel: key => {
      if (!handles.has(key)) return
      clearTimeout(handles.get(key))
      handles.delete(key)
    },
    setDelayMS: newDelayMS => (delayMS = newDelayMS)
  }
  return api
}
