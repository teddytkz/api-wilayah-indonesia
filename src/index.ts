import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { getDb } from '../lib/mongodb.js'
import { apiKeyMiddleware } from '../lib/apiKey.js'

const app = new Hono().basePath('/api/wilayah')

app.use('*', apiKeyMiddleware)

app.get('/provinsi', async (c) => {
  try {
    const { db, server } = await getDb()
    const start = Date.now()
    const provinces = await db
      .collection('provinces')
      .find({}, { projection: { _id: 0 } })
      .sort({ id: 1 })
      .toArray()
    return c.json({ success: true, server, 'time-db': Date.now() - start, total: provinces.length, data: provinces })
  } catch {
    return c.json({ success: false, message: 'Internal server error' }, 500)
  }
})

app.get('/kabupaten', async (c) => {
  try {
    const provinceId = c.req.query('province-id')
    const { db, server } = await getDb()
    const start = Date.now()

    if (provinceId) {
      const doc = await db
        .collection('regencies')
        .findOne({ province_id: provinceId }, { projection: { _id: 0, data: 1 } })
      const data = (doc?.data as { id: string; name: string }[]) ?? []
      return c.json({ success: true, server, 'time-db': Date.now() - start, total: data.length, data })
    }

    const docs = await db
      .collection('regencies')
      .find({}, { projection: { _id: 0, data: 1 } })
      .toArray()
    const data = docs.flatMap((d) => d.data as { id: string; name: string }[])
    return c.json({ success: true, server, 'time-db': Date.now() - start, total: data.length, data })
  } catch {
    return c.json({ success: false, message: 'Internal server error' }, 500)
  }
})

app.get('/kecamatan', async (c) => {
  try {
    const regencyId = c.req.query('regency-id')
    const { db, server } = await getDb()
    const start = Date.now()

    if (regencyId) {
      const doc = await db
        .collection('districts')
        .findOne({ regency_id: regencyId }, { projection: { _id: 0, data: 1 } })
      const data = (doc?.data as { id: string; name: string }[]) ?? []
      return c.json({ success: true, server, 'time-db': Date.now() - start, total: data.length, data })
    }

    const docs = await db
      .collection('districts')
      .find({}, { projection: { _id: 0, data: 1 } })
      .toArray()
    const data = docs.flatMap((d) => d.data as { id: string; name: string }[])
    return c.json({ success: true, server, 'time-db': Date.now() - start, total: data.length, data })
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
    const { db, server } = await getDb()
    const start = Date.now()
    const doc = await db
      .collection('villages')
      .findOne({ district_id: districtId }, { projection: { _id: 0, data: 1 } })
    const data = (doc?.data as { id: string; name: string }[]) ?? []
    return c.json({ success: true, server, 'time-db': Date.now() - start, total: data.length, data })
  } catch {
    return c.json({ success: false, message: 'Internal server error' }, 500)
  }
})

app.notFound((c) => c.json({ success: false, message: 'Not found' }, 404))

export default app

if ((import.meta as { main?: boolean }).main) {
  const port = Number(process.env.PORT) || 3001
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`Server running at http://localhost:${info.port}`)
  })
}
