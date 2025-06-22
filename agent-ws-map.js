// Map the agent websocket api into the application's websocket api
export default () =>
  async ({ agent_ws_server, app }) => {
    // Map methods and events to the application api
    const get_app = socket => {
      const token = socket.request?.authorization
      if (!token) throw { ok: false, status: 401 }
      const a = app.app(token.app_id)
      if (!a) throw { ok: false, status: 404 }
      if (!a.agent(token.agent_id)) {
        if (a.is_connected) throw { ok: false, status: 404 }
        throw { ok: false, status: 500 }
      }
      return a
    }
    agent_ws_server.register_unhandled(async (name, params, socket) => {
      return await get_app(socket).call(name, params, socket)
    })
  }
