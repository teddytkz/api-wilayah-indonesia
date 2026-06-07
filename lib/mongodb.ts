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

export async function getDb(): Promise<{ db: Db; server: 'primary' | 'secondary' }> {
  const promises = g._mongoClientPromises!
  const index = g._mongoRoundRobinIndex! % promises.length
  g._mongoRoundRobinIndex = index + 1
  const client = await promises[index]
  return { db: client.db(dbName), server: index === 0 ? 'primary' : 'secondary' }
}
