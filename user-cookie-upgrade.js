import cookies from 'cookies'

export default () =>
  async ({ httpServer, jwt }) => {
    httpServer.on('upgrade', req => {
      try {
        const cookieJar = cookies(req, {}, { keys: [process.env.XY_COOKIE_SECRET] })
        const token = cookieJar.get('xy_auth_token', { signed: true })
        if (!token) return
        req.authorization = jwt.verify(token)
      } catch (e) {
        console.error('👾 X user auth', JSON.stringify(e, Object.getOwnPropertyNames(e)))
      }
    })
  }
