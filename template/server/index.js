/**
 * @description Setup 2 servers serving http and https protocols
 * @description It use the following
 * @description 1. koa as an app server as an alternative to express
 * @description 2. http as the http server
 * @description 3. https as the https server
 * @description 4. koa-sslify to redirect http request to https server
 */

import Koa from 'koa'
import { Nuxt, Builder } from 'nuxt'
const fs = require('fs')
const path = require('path')

// Import and Set Nuxt.js options
const config = require('../nuxt.config.js')
const app = new Koa()

// for http2 server
const http2 = require('http2')
// for http server
const http = require('http')
// for forcing/redirecting to ssl
const forceSSL = require('koa-sslify')

// Instantiate nuxt.js
const nuxt = new Nuxt(config)

/**
 * @description Configuration of servers serving http and https protocol request
 * @description You can change:
 * @description 1. http port 80 to a new valid one
 * @description 2. https port 443 to a new valid one
 * @description 3. Set of valid certificate & key file to create https server (ssl)
 */
const setting = {
  host: 'localhost',
  http: {
    port: process.env.HOST || 80
  },
  https: {
    port: 443,
    options: {
      key: fs.readFileSync(path.resolve(process.cwd(), 'build/certs/server.key')),
      cert: fs.readFileSync(path.resolve(process.cwd(), 'build/certs/server.crt'))
    }
  }
}

const isDevelopment = !(app.env === 'production')

/**
 * @description Build in development
 */
if (isDevelopment) {
  const builder = new Builder(nuxt)
  builder.build().catch(e => {
    console.error(e) // eslint-disable-line no-console
    process.exit(1)
  })
}

/**
 * @description T Force SSL on all page.
 * @description Therefore, this will redirect http protocol request
 * @description to https protocol on https://host:portHttps
 */
app.use(forceSSL({
  trustProtoHeader: true,
  port: setting.https.port,
  hostname: setting.host,
  ignoreUrl: false
}))

app.use(ctx => {
  ctx.status = 200 // koa defaults to 404 when it sees that status is unset

  return new Promise((resolve, reject) => {
    ctx.res.on('close', resolve)
    ctx.res.on('finish', resolve)
    nuxt.render(ctx.req, ctx.res, promise => {
      // nuxt.render passes a rejected promise into callback on error.
      promise.then(resolve).catch(reject)
    })
  })
})

// Setup a server to serve http protocol
http.createServer(app.callback()).listen(setting.http.port)

// Setup a server to serve https protocol
http2
.createServer(setting.https.options, app.callback())
.listen(setting.https.port, (err) => {
  if (err) {
    throw new Error(err)
  }

  console.log('Listening on port: ' + setting.https.port + '.')
})
