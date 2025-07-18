// Connect to the platform and allow application installation and removal
import { createClient } from 'xy-websocket'
import { backOff } from 'exponential-backoff'

export default ({ app_host_api, app_host_auth_token, call_timeout }) =>
  async ({ app_name, app, hub }) => {
    console.log(`👾 . ${app_name} host -> ${app_host_api}`)
    const app_host_ws_client = createClient({
      url: app_host_api.replace(/^http/, 'ws'),
      wsOptions: {
        finishRequest: req => {
          req.setHeader('Authorization', `Bearer ${app_host_auth_token}`)
          req.end()
        },
        followRedirects: true
      },
      call_timeout
    })
    app_host_ws_client.on('connected', async () => {
      hub.emit('connected')
      app_host_ws_client.register('/app/install', async ({ app_id, auth_token, connect_url }) => {
        const res = await app.create({ app_id, auth_token, connect_url })
        hub.emit('app_installed', res)
        return res
      })
      app_host_ws_client.register('/app/remove', async ({ app_id }) => {
        const a = app.app(app_id)
        if (!a) throw new Error('App not found')
        try {
          await a.core_ws_client.call('/app/app_config', {
            app_id: a.app_id,
            config: { ...a.config, app_host_id: null }
          })
        } catch (e) {
          console.error(`👾 X ${app_name} app remove`, JSON.stringify(e, Object.getOwnPropertyNames(e)))
        }
        await a.close()
        hub.emit('app_removed', a)
      })

      await backOff(async () => await app_host_ws_client.call('/app_host/app_host_register', {}), {
        startingDelay: 200,
        numOfAttempts: Number.MAX_SAFE_INTEGER,
        maxDelay: 10000,
        retry: e => {
          console.error(`👾 X ${app_name} host`, JSON.stringify(e, Object.getOwnPropertyNames(e)))
          return app_host_ws_client.is_connected()
        }
      })

      console.log(`👾 √ ${app_name} host`)

      hub.on('shutdown', async () => {
        app_host_ws_client.close()
        // Sleep
        await new Promise(resolve => setTimeout(resolve, 200))
      })
    })
  }
