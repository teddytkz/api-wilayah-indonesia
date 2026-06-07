import { MongoClient, type Collection, type Db } from 'mongodb'
import * as fs from 'fs'
import * as path from 'path'

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || 'wilayah-ri'

if (!uri) {
  console.error('MONGODB_URI is not set in .env.local')
  process.exit(1)
}

const DATA_DIR = path.join(__dirname, '../data')
const BATCH_SIZE = 50

type Doc = Record<string, string>

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
}

function getAllFilesInDir(dir: string): string[] {
  return fs.readdirSync(dir).map((f) => path.join(dir, f))
}

async function dropCollection(db: Db, name: string) {
  try {
    await db.collection(name).drop()
  } catch {
    // collection belum ada, tidak perlu di-drop
  }
}

async function insertBatch(collection: Collection, docs: Doc[]): Promise<number> {
  if (docs.length === 0) return 0
  try {
    const result = await collection.insertMany(docs, { ordered: false })
    return result.insertedCount
  } catch (err: any) {
    // skip duplicate key errors, hitung yang berhasil masuk
    if (err.code === 11000 || err.name === 'BulkWriteError') {
      return err.result?.nInserted ?? 0
    }
    throw err
  }
}

async function seed(): Promise<void> {
  const client = new MongoClient(uri!)

  try {
    await client.connect()
    console.log('Connected to MongoDB')
    const db = client.db(dbName)

    // -- Provinces --
    console.log('\nSeeding provinces...')
    await dropCollection(db, 'provinces')
    await db.collection('provinces').createIndex({ id: 1 }, { unique: true })
    const provinces = readJson<Doc[]>(path.join(DATA_DIR, 'province.json'))
    const insertedProvinces = await insertBatch(db.collection('provinces'), provinces)
    console.log(`  Inserted ${insertedProvinces}/${provinces.length} provinces`)

    // -- Regencies --
    console.log('\nSeeding regencies...')
    await dropCollection(db, 'regencies')
    await db.collection('regencies').createIndex({ id: 1 }, { unique: true })
    await db.collection('regencies').createIndex({ province_id: 1 })
    const regencyFiles = getAllFilesInDir(path.join(DATA_DIR, 'regency'))
    let totalRegencies = 0
    for (const file of regencyFiles) {
      const data = readJson<Doc[]>(file)
      totalRegencies += await insertBatch(db.collection('regencies'), data)
    }
    console.log(`  Inserted ${totalRegencies} regencies from ${regencyFiles.length} files`)

    // -- Districts --
    console.log('\nSeeding districts...')
    await dropCollection(db, 'districts')
    await db.collection('districts').createIndex({ id: 1 }, { unique: true })
    await db.collection('districts').createIndex({ regency_id: 1 })
    const districtFiles = getAllFilesInDir(path.join(DATA_DIR, 'district'))
    let totalDistricts = 0
    for (let i = 0; i < districtFiles.length; i += BATCH_SIZE) {
      const docs = districtFiles.slice(i, i + BATCH_SIZE).flatMap((f) => readJson<Doc[]>(f))
      totalDistricts += await insertBatch(db.collection('districts'), docs)
      process.stdout.write(`\r  Progress: ${Math.min(i + BATCH_SIZE, districtFiles.length)}/${districtFiles.length} files`)
    }
    console.log(`\n  Inserted ${totalDistricts} districts from ${districtFiles.length} files`)

    // -- Villages --
    console.log('\nSeeding villages...')
    await dropCollection(db, 'villages')
    await db.collection('villages').createIndex({ id: 1 }, { unique: true })
    await db.collection('villages').createIndex({ district_id: 1 })
    const villageFiles = getAllFilesInDir(path.join(DATA_DIR, 'village'))
    let totalVillages = 0
    for (let i = 0; i < villageFiles.length; i += BATCH_SIZE) {
      const docs = villageFiles.slice(i, i + BATCH_SIZE).flatMap((f) => readJson<Doc[]>(f))
      totalVillages += await insertBatch(db.collection('villages'), docs)
      process.stdout.write(`\r  Progress: ${Math.min(i + BATCH_SIZE, villageFiles.length)}/${villageFiles.length} files`)
    }
    console.log(`\n  Inserted ${totalVillages} villages from ${villageFiles.length} files`)

    console.log('\nSeed completed successfully!')
  } catch (err) {
    console.error('Seed failed:', err)
    process.exit(1)
  } finally {
    await client.close()
  }
}

seed()
