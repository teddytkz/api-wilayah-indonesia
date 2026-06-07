import { MongoClient, type Db } from 'mongodb'

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || 'wilayah-ri'

if (!uri) throw new Error('MONGODB_URI is not defined in environment variables')

const globalWithMongo = global as typeof global & { _mongoClientPromise?: Promise<MongoClient> }

if (!globalWithMongo._mongoClientPromise) {
  const client = new MongoClient(uri)
  globalWithMongo._mongoClientPromise = client.connect()
}

export async function getDb(): Promise<Db> {
  const client = await globalWithMongo._mongoClientPromise!
  return client.db(dbName)
}
