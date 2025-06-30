import ref from './ref.js'
import process from 'node:process'

export default ({ hub }) => {
  let isstartingup = true
  let isshuttingdown = false

  const startup = ref()
  const sensitive = ref()

  hub.on('terminate', async method => {
    try {
      if (isshuttingdown) {
        if (method == 'SIGTERM') {
          console.log('👾 E noho rā! (SIGTERM)')
          process.exit(0)
        }
        return
      }
      isshuttingdown = true
      await sensitive.released()
      console.log(`👾 Ohākī... (${method})`)
      await hub.emit('shutdown')
      console.log('👾 E noho rā!')
      process.exit(0)
    } catch (e) {
      console.error('👾', JSON.stringify(e, Object.getOwnPropertyNames(e)))
      process.exit(0)
    }
  })

  hub.on('ready', () => {
    ;(async () => {
      await startup.released()
      isstartingup = false
    })()
  })

  process.on('SIGTERM', () => hub.emit('terminate', 'SIGTERM'))
  process.on('SIGINT', () => hub.emit('terminate', 'SIGINT'))

  return {
    startup,
    sensitive
  }
}
