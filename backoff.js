export default ({ attempt = 0, ms = 500, max = 5, factor = 1.7 } = {}) => {
  const api = {
    attempt,
    exp: attempt => ms * Math.pow(factor, Math.min(max, attempt) - 1 + 2 * Math.random()),
    next: () => {
      api.attempt++
      return api.exp(api.attempt - 1)
    },
    reset: () => (api.attempt = 0)
  }
  return api
}
