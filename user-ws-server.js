import { Hub } from './hub.js'

// Websocket shim for users
const WebSocketShim = () => {
  const hub = Hub()
  const registry = new Map()

  return {
    on: (e, ...args) => hub.on(e, ...args),
    sendEvent: hub.emit,
    register: (c, fn) => registry.set(c, fn),
    call: async (c, p, socket) => {
      if (!registry.has(c)) throw new UnknownCall(`'${c}' not found`)
      return await registry.get(c)(p ?? {}, socket)
    }
  }
}

class UnknownCall extends Error {
  constructor(message) {
    super(message)
    this.name = this.constructor.name
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor)
  }
}

// This is a standin that represents an application's websocket server and translates to the app host server
export default () =>
  async ({ app }) => {
    const user_ws_shim = WebSocketShim()
    app.call = user_ws_shim.call
    app.sendEvent = user_ws_shim.sendEvent
    return { user_ws_shim }
  }

export { UnknownCall }
