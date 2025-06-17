export default ({ delayMS = 1000 } = {}) => {
  const expectedVersions = new Map()
  const pending = new Map()
  const handles = new Map()
  const drain = key => {
    if (!pending.has(key)) return
    const fns = pending.get(key)
    if (fns.length == 0) return pending.delete(key)
    if (expectedVersions.has(key)) {
      const expectedVersion = expectedVersions.get(key)
      if (fns[0].version < expectedVersion) return
      expectedVersions.delete(key)
    }
    const { fn } = fns.shift()
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
    enqueue: (key, version, fn) => {
      if (!pending.has(key)) pending.set(key, [])
      pending.get(key).push({ version, fn })
      check(key)
    },
    setExpectedVersion: (key, expectedVersion) => {
      expectedVersions.set(key, Math.max(expectedVersions.get(key) ?? 0, expectedVersion))
    },
    setDelayMS: newDelayMS => (delayMS = newDelayMS)
  }
  return api
}
