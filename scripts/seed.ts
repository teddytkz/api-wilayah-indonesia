import { MongoClient, type Db } from 'mongodb'
import * as fs from 'fs'
import * as path from 'path'

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || 'wilayah-ri'

if (!uri) {
  console.error('MONGODB_URI is not set in .env')
  process.exit(1)
}

const DATA_DIR = path.join(__dirname, '../data')
const BATCH_SIZE = 100

type Item = { id: string; name: string; [key: string]: string }

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
    // collection belum ada
  }
}

async function seed(): Promise<void> {
  const client = new MongoClient(uri!)

  try {
    await client.connect()
    console.log('Connected to MongoDB')
    const db = client.db(dbName)

    // -- Provinces --
    // Struktur: { id, name } — flat, tidak ada parent
    console.log('\nSeeding provinces...')
    await dropCollection(db, 'provinces')
    await db.collection('provinces').createIndex({ id: 1 }, { unique: true })
    const provinces = readJson<Item[]>(path.join(DATA_DIR, 'province.json'))
    await db.collection('provinces').insertMany(provinces)
    console.log(`  Inserted ${provinces.length} provinces`)

    // -- Regencies --
    // Struktur: { province_id, data: [{ id, name }] }
    console.log('\nSeeding regencies...')
    await dropCollection(db, 'regencies')
    await db.collection('regencies').createIndex({ province_id: 1 }, { unique: true })
    const regencyFiles = getAllFilesInDir(path.join(DATA_DIR, 'regency'))
    let totalRegencies = 0
    for (let i = 0; i < regencyFiles.length; i += BATCH_SIZE) {
      const docs = regencyFiles.slice(i, i + BATCH_SIZE).flatMap((file) => {
        const items = readJson<Item[]>(file)
        if (items.length === 0) return []
        return [{ province_id: items[0].province_id, data: items.map(({ id, name }) => ({ id, name })) }]
      })
      if (docs.length > 0) {
        await db.collection('regencies').insertMany(docs)
        totalRegencies += docs.length
      }
    }
    console.log(`  Inserted ${totalRegencies} regency groups from ${regencyFiles.length} files`)

    // -- Districts --
    // Struktur: { regency_id, data: [{ id, name }] }
    console.log('\nSeeding districts...')
    await dropCollection(db, 'districts')
    await db.collection('districts').createIndex({ regency_id: 1 }, { unique: true })
    const districtFiles = getAllFilesInDir(path.join(DATA_DIR, 'district'))
    let totalDistricts = 0
    for (let i = 0; i < districtFiles.length; i += BATCH_SIZE) {
      const docs = districtFiles.slice(i, i + BATCH_SIZE).flatMap((file) => {
        const items = readJson<Item[]>(file)
        if (items.length === 0) return []
        return [{ regency_id: items[0].regency_id, data: items.map(({ id, name }) => ({ id, name })) }]
      })
      if (docs.length > 0) {
        await db.collection('districts').insertMany(docs)
        totalDistricts += docs.reduce((sum, d) => sum + d.data.length, 0)
      }
      process.stdout.write(`\r  Progress: ${Math.min(i + BATCH_SIZE, districtFiles.length)}/${districtFiles.length} files`)
    }
    console.log(`\n  Inserted ${totalDistricts} districts from ${districtFiles.length} files`)

    // -- Villages --
    // Struktur: { district_id, data: [{ id, name }] }
    console.log('\nSeeding villages...')
    await dropCollection(db, 'villages')
    await db.collection('villages').createIndex({ district_id: 1 }, { unique: true })
    const villageFiles = getAllFilesInDir(path.join(DATA_DIR, 'village'))
    let totalVillages = 0
    for (let i = 0; i < villageFiles.length; i += BATCH_SIZE) {
      const docs = villageFiles.slice(i, i + BATCH_SIZE).flatMap((file) => {
        const items = readJson<Item[]>(file)
        if (items.length === 0) return []
        return [{ district_id: items[0].district_id, data: items.map(({ id, name }) => ({ id, name })) }]
      })
      if (docs.length > 0) {
        await db.collection('villages').insertMany(docs)
        totalVillages += docs.reduce((sum, d) => sum + d.data.length, 0)
      }
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
