export default () =>
  async ({ user_ws_shim, hub, app }) => {
    // Keep track of connected users
    const usersockets_byid = new Map()
    hub.on('user connected', async ({ user_id, socket }) => {
      if (!usersockets_byid.has(user_id)) usersockets_byid.set(user_id, new Set())
      usersockets_byid.get(user_id).add(socket)
    })
    hub.on('user disconnected', async ({ user_id, socket }) => {
      if (usersockets_byid.has(user_id)) usersockets_byid.get(user_id).delete(socket)
    })
    app.sockets_byuserid = user_id => [...usersockets_byid.get(user_id)]
    app.sockets = () => Array.from(usersockets_byid.values(), s => [...s]).flat()

    user_ws_shim.register('/user/register', async (_, socket) => {
      const user_id = socket.request.authorization?.user_id
      socket.on('close', () => hub.emit('user disconnected', { user_id, socket }))
      await hub.emit('user connected', { user_id, socket })
    })
  }
