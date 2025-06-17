export default () => {
  const expectedVersions = new Map()
  const pending = new Map()
  const api = {
    enqueue: (key, currentVersion, fn) => {
      if (!expectedVersions.has(key)) return fn()
      const expectedVersion = expectedVersions.get(key)
      if (currentVersion < expectedVersion) {
        console.log('Version debounce: skipping', { key, currentVersion, expectedVersion })
        return pending.set(key, fn)
      }
      expectedVersions.delete(key)
      pending.delete(key)
      fn()
    },
    setExpectedVersion: (key, expectedVersion) => {
      expectedVersions.set(key, Math.max(expectedVersions.get(key) ?? 0, expectedVersion))
    }
  }
  return api
}
