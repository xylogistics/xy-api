export default ({ delayMS = 1000 } = {}) => {
  const pending = new Map()
  const handles = new Map()
  const drain = key => {
    if (!pending.has(key)) return
    const fns = pending.get(key)
    if (fns.length == 0) return pending.delete(key)
    const fn = fns.shift()
    if (fns.length == 0) pending.delete(key)
    fn()
    if (!pending.has(key)) return
    check(key)
  }
  const check = key => {
    if (handles.has(key)) return
    handles.set(
      key,
      setTimeout(() => {
        handles.delete(key)
        drain(key)
      }, delayMS)
    )
  }
  const api = {
    enqueue: (key, fn) => {
      if (!pending.has(key)) pending.set(key, [])
      pending.get(key).push(fn)
      check(key)
    },
    cancel: key => {
      if (!handles.has(key)) return
      clearTimeout(handles.get(key))
      handles.delete(key)
    }
  }
  return api
}
