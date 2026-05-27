import { spawn } from 'node:child_process'
import http from 'node:http'

const port = 5174
const url = `http://127.0.0.1:${port}/`

const server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'],
})

let serverOutput = ''
server.stdout.on('data', (chunk) => {
  serverOutput += chunk.toString()
})
server.stderr.on('data', (chunk) => {
  serverOutput += chunk.toString()
})

function waitForServer() {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 30_000

    function check() {
      const request = http.get(url, (response) => {
        response.resume()
        resolve()
      })
      request.on('error', () => {
        if (Date.now() > deadline) {
          reject(new Error(`Timed out waiting for ${url}\n${serverOutput}`))
          return
        }
        setTimeout(check, 250)
      })
      request.setTimeout(1000, () => request.destroy())
    }

    check()
  })
}

function runPlaywright() {
  return new Promise((resolve) => {
    const child = spawn('npx', ['playwright', 'test'], { stdio: 'inherit' })
    child.on('exit', (code) => resolve(code ?? 1))
  })
}

try {
  await waitForServer()
  const code = await runPlaywright()
  process.exitCode = code
} finally {
  server.kill()
}
