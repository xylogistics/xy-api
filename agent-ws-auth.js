import sleep from './sleep.js'

// Pipe agent auth completion to the agent's socket using the passcode
export default () =>
  async ({ jwt, agent_ws_server, core_ws_client, app }) => {
    const complete_auth_workflow = async ({ agent_id, passcode }) => {
      for (const socket of agent_ws_server.sockets()) {
        if (socket.passcode != passcode) continue
        socket.passcode = null
        try {
          await socket.call('/agent/complete_auth_workflow', {
            auth_token: jwt.sign({ app_id: app.app_id, agent_id: agent_id })
          })
          return { ok: true }
        } catch (e) {
          console.error('👾 X complete_auth_workflow', JSON.stringify(e, Object.getOwnPropertyNames(e)))
          return { ok: false, status: 500 }
        }
      }
      return { ok: false, status: 404, message: 'passcode socket not found' }
    }

    core_ws_client.register('/agent/complete_auth_workflow', complete_auth_workflow)

    core_ws_client.register('/app/agents_reset', async agents => {
      for (const { agent_id } of agents) {
        const socket = app.socket_byagentid(agent_id)
        if (!socket) continue
        if (socket.readyState !== agent_ws_server.OPEN) continue
        await socket.call('/agent/reset', { agent_id })
      }
      await sleep(20)
      for (const { agent_id } of agents) {
        const socket = app.socket_byagentid(agent_id)
        if (!socket) continue
        socket.destroy()
      }
    })
  }
