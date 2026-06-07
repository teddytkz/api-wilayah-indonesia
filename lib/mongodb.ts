import { MongoClient, type Db } from 'mongodb'

const dbName = process.env.MONGODB_DB || 'wilayah-ri'

const uris = [
  process.env.MONGODB_URI,
  process.env.MONGODB_URI_SECOND,
].filter((uri): uri is string => !!uri)

if (uris.length === 0) throw new Error('MONGODB_URI is not defined in environment variables')

type GlobalWithMongo = typeof global & {
  _mongoClientPromises?: Promise<MongoClient>[]
  _mongoRoundRobinIndex?: number
}

const g = global as GlobalWithMongo

if (!g._mongoClientPromises) {
  g._mongoClientPromises = uris.map((uri) => new MongoClient(uri).connect())
  g._mongoRoundRobinIndex = 0
}

function serverLabel(index: number): 'primary' | 'secondary' {
  return index === 0 ? 'primary' : 'secondary'
}

export async function query<T>(
  fn: (db: Db) => Promise<T>
): Promise<{ result: T; server: 'primary' | 'secondary' }> {
  const promises = g._mongoClientPromises!
  const index = g._mongoRoundRobinIndex! % promises.length
  g._mongoRoundRobinIndex = index + 1

  try {
    const client = await promises[index]
    const result = await fn(client.db(dbName))
    return { result, server: serverLabel(index) }
  } catch (err) {
    if (promises.length < 2) throw err

    // failover ke server lain
    const fallbackIndex = (index + 1) % promises.length
    const client = await promises[fallbackIndex]
    const result = await fn(client.db(dbName))
    return { result, server: serverLabel(fallbackIndex) }
  }
}

// untuk seed script
export async function getDb(): Promise<Db> {
  const client = await g._mongoClientPromises![0]
  return client.db(dbName)
}
