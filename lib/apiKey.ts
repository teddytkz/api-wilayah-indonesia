import type { Context, Next } from 'hono'

export async function apiKeyMiddleware(c: Context, next: Next) {
  const apiKey = c.req.header('x-api-key')

  if (!apiKey) {
    return c.json({ success: false, message: 'API key missing. Include x-api-key in request header.' }, 401)
  }

  if (apiKey !== process.env.API_KEY) {
    return c.json({ success: false, message: 'Invalid API key.' }, 403)
  }

  await next()
}
