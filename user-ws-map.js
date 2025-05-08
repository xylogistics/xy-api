// Map the agent websocket api into the application's websocket api
export default () =>
  async ({ user_ws_server, app }) => {
    // Map methods and events to the application api
    const get_app = socket => {
      const token = socket.request?.authorization
      if (!token) throw { ok: false, status: 401 }
      const a = app.app(token.app_id)
      if (!a) throw { ok: false, status: 404 }
      return a
    }
    user_ws_server.register_unhandled((name, params, socket) => {
      return get_app(socket).call(name, params, socket)
    })
    // Events are untested! What events will come from a connected agent?
    user_ws_server.unhandled((e, params, socket) => {
      if (!socket) return
      try {
        get_app(socket).sendEvent(e, params, socket)
      } catch (e) {
        if (!e.ok) return
        console.error('Error in websocket event', e)
      }
    })
  }
