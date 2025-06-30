export default () =>
  async ({ httpServer, jwt }) => {
    httpServer.on('upgrade', req => {
      const token = req.headers.authorization?.split(' ')[1] ?? req.headers['sec-websocket-protocol']
      if (!token) return
      try {
        req.authorization = jwt.verify(token)
      } catch (e) {
        console.error('👾 X user auth', JSON.stringify(e, Object.getOwnPropertyNames(e)))
      }
    })
  }
