// Create an application's connection to the core
import { createClient } from 'xy-websocket'
import { backOff } from 'exponential-backoff'

export default ({ app_host_id }) =>
  async ({ app_name = 'XY App', hub, app }) => {
    console.log(`👾 . ${app_name} app -> ${app.connect_url}`)
    const core_ws_client = createClient({
      url: app.connect_url,
      wsOptions: {
        finishRequest: req => {
          req.setHeader('Authorization', `Bearer ${app.auth_token}`)
          req.end()
        },
        followRedirects: true
      }
    })
    app.core_ws_client = core_ws_client
    core_ws_client.on('connected', async () => {
      console.log(`👾 √ ${app_name} app (${app.app_id})`)
      const result = await backOff(() => core_ws_client.call('/app/app_register', {}), {
        numOfAttempts: Number.MAX_SAFE_INTEGER,
        maxDelay: 10000,
        retry: e => {
          console.error(`👾 X ${app_name} app`, JSON.stringify(e, Object.getOwnPropertyNames(e)))
          return core_ws_client.is_connected()
        }
      })
      console.log(`👾 √ ${app_name} app ${result.config?.name}`)
      hub.emit('connected')
      hub.emit('app_config', result)
      hub.emit('app_payload', result)
      // Set app_host_id for ownership
      if (result.config.app_host_id != app_host_id)
        core_ws_client.call('/app/app_config', {
          app_id: app.app_id,
          config: { ...result.config, app_host_id }
        })
      for (const a of result.agents) {
        a.app_config = result.config
        a.app_payload = result.payload
      }
      hub.emit('agents_assert', result.agents)
      if (app.socket_byagentid)
        hub.emit(
          'agents_connected',
          result.agents.map(a => ({
            agent_id: a.agent_id,
            is_connected: app.socket_byagentid(a.agent_id)
          }))
        )
    })

    const relay = (e1, e2) => core_ws_client.on(e1, params => hub.emit(e2, params))

    relay('/app/app_config', 'app_config')
    relay('/app/app_payload', 'app_payload')
    relay('/app/agents_assert', 'agents_assert')
    relay('/app/agents_delete', 'agents_delete')
    relay('/app/agents_config', 'agents_config')
    relay('/app/agents_payload', 'agents_payload')
    relay('/app/agents_app_status', 'agents_app_status')
    relay('/app/agents_core_status', 'agents_core_status')
    relay('disconnected', 'disconnected')

    hub.on('agent connected', async ({ agent }) => {
      if (!core_ws_client.is_connected()) return
      core_ws_client.call('/app/agents_connected', [
        {
          agent_id: agent.agent_id,
          is_connected: true
        }
      ])
    })

    hub.on('agent disconnected', async ({ agent }) => {
      if (!core_ws_client.is_connected()) return
      core_ws_client.call('/app/agents_connected', [
        {
          agent_id: agent.agent_id,
          is_connected: false
        }
      ])
    })

    let connectionInterval = setInterval(async () => {
      if (!app.socket_byagentid || !core_ws_client.is_connected()) return
      hub.emit(
        'agents_connected',
        app.agents().map(a => ({
          agent_id: a.agent_id,
          is_connected: app.socket_byagentid(a.agent_id)
        }))
      )
    }, 30000)

    hub.on('close', async () => {
      if (!connectionInterval) return
      clearInterval(connectionInterval)
      connectionInterval = null
    })

    return { core_ws_client }
  }
