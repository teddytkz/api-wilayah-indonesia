import { Hono } from 'hono'
import { handle } from '@hono/node-server/vercel'
import { serve } from '@hono/node-server'
import { getDb } from '../lib/mongodb'
import { apiKeyMiddleware } from '../lib/apiKey'

export const config = { runtime: 'nodejs' }

const app = new Hono().basePath('/api/wilayah')

app.use('*', apiKeyMiddleware)

app.get('/provinsi', async (c) => {
  try {
    const db = await getDb()
    const provinces = await db
      .collection('provinces')
      .find({}, { projection: { _id: 0 } })
      .sort({ id: 1 })
      .toArray()
    return c.json({ success: true, total: provinces.length, data: provinces })
  } catch {
    return c.json({ success: false, message: 'Internal server error' }, 500)
  }
})

app.get('/kabupaten', async (c) => {
  try {
    const provinceId = c.req.query('province-id')
    const db = await getDb()
    const filter = provinceId ? { province_id: provinceId } : {}
    const regencies = await db
      .collection('regencies')
      .find(filter, { projection: { _id: 0 } })
      .sort({ id: 1 })
      .toArray()
    return c.json({ success: true, total: regencies.length, data: regencies })
  } catch {
    return c.json({ success: false, message: 'Internal server error' }, 500)
  }
})

app.get('/kecamatan', async (c) => {
  try {
    const regencyId = c.req.query('regency-id')
    const db = await getDb()
    const filter = regencyId ? { regency_id: regencyId } : {}
    const districts = await db
      .collection('districts')
      .find(filter, { projection: { _id: 0 } })
      .sort({ id: 1 })
      .toArray()
    return c.json({ success: true, total: districts.length, data: districts })
  } catch {
    return c.json({ success: false, message: 'Internal server error' }, 500)
  }
})

app.get('/desa', async (c) => {
  const districtId = c.req.query('district-id')
  if (!districtId) {
    return c.json({ success: false, message: 'district-id query param is required' }, 400)
  }
  try {
    const db = await getDb()
    const villages = await db
      .collection('villages')
      .find({ district_id: districtId }, { projection: { _id: 0 } })
      .sort({ id: 1 })
      .toArray()
    return c.json({ success: true, total: villages.length, data: villages })
  } catch {
    return c.json({ success: false, message: 'Internal server error' }, 500)
  }
})

export default handle(app)

if ((import.meta as { main?: boolean }).main) {
  const port = Number(process.env.PORT) || 3001
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`Server running at http://localhost:${info.port}`)
  })
}
