# API Wilayah RI

REST API data wilayah Indonesia (Provinsi, Kabupaten/Kota, Kecamatan, Desa/Kelurahan) berbasis Hono + MongoDB, siap deploy ke Vercel.

## Stack

- **Runtime**: [Bun](https://bun.sh)
- **Framework**: [Hono](https://hono.dev)
- **Database**: MongoDB Atlas
- **Deploy**: Vercel

## Struktur Data

| Collection   | Field                         | Keterangan              |
|--------------|-------------------------------|-------------------------|
| `provinces`  | `id`, `name`                  | 34 provinsi             |
| `regencies`  | `id`, `province_id`, `name`   | Kabupaten / Kota        |
| `districts`  | `id`, `regency_id`, `name`    | Kecamatan               |
| `villages`   | `id`, `district_id`, `name`   | Desa / Kelurahan        |

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Konfigurasi environment

Buat file `.env` berdasarkan `.env.example`:

```bash
cp .env.example .env
```

Isi variabel berikut:

```env
MONGODB_URI=mongodb+srv://user:pass@host/wilayah-ri?retryWrites=true&w=majority
MONGODB_DB=wilayah-ri
API_KEY=your-secret-api-key-here
```

### 3. Seed data ke MongoDB

Jalankan script migrasi untuk memasukkan semua data wilayah ke MongoDB:

```bash
bun run seed
```

Script ini akan membuat 4 collection (`provinces`, `regencies`, `districts`, `villages`) beserta index-nya secara otomatis.

### 4. Jalankan server lokal

```bash
bun run dev
```

Server berjalan di `http://localhost:3001`.

## Endpoints

Semua endpoint memerlukan header `x-api-key`.

### GET `/api/wilayah/provinsi`

Daftar semua provinsi.

```bash
curl http://localhost:3001/api/wilayah/provinsi \
  -H "x-api-key: your-api-key"
```

```json
{
  "success": true,
  "total": 34,
  "data": [
    { "id": "11", "name": "ACEH" },
    { "id": "12", "name": "SUMATERA UTARA" }
  ]
}
```

---

### GET `/api/wilayah/kabupaten?province-id={id}`

Daftar kabupaten/kota. Filter by provinsi menggunakan query param `province-id`.

```bash
curl "http://localhost:3001/api/wilayah/kabupaten?province-id=11" \
  -H "x-api-key: your-api-key"
```

```json
{
  "success": true,
  "total": 23,
  "data": [
    { "id": "1101", "province_id": "11", "name": "SIMEULUE" }
  ]
}
```

---

### GET `/api/wilayah/kecamatan?regency-id={id}`

Daftar kecamatan. Filter by kabupaten menggunakan query param `regency-id`.

```bash
curl "http://localhost:3001/api/wilayah/kecamatan?regency-id=1101" \
  -H "x-api-key: your-api-key"
```

```json
{
  "success": true,
  "total": 8,
  "data": [
    { "id": "1101010", "regency_id": "1101", "name": "TEUPAH SELATAN" }
  ]
}
```

---

### GET `/api/wilayah/desa?district-id={id}`

Daftar desa/kelurahan berdasarkan kecamatan. Query param `district-id` **wajib**.

```bash
curl "http://localhost:3001/api/wilayah/desa?district-id=1101010" \
  -H "x-api-key: your-api-key"
```

```json
{
  "success": true,
  "total": 9,
  "data": [
    { "id": "1101010001", "district_id": "1101010", "name": "LATIUNG" }
  ]
}
```

---

## Response Error

| Status | Keterangan                              |
|--------|-----------------------------------------|
| `400`  | Query param wajib tidak disertakan      |
| `401`  | Header `x-api-key` tidak ada           |
| `403`  | API key tidak valid                     |
| `405`  | Method selain GET                       |
| `500`  | Internal server error                   |

```json
{ "success": false, "message": "API key missing. Include x-api-key in request header." }
```

## Deploy ke Vercel

1. Push repository ke GitHub
2. Import project di [vercel.com](https://vercel.com)
3. Tambahkan environment variables di Vercel dashboard:
   - `MONGODB_URI`
   - `MONGODB_DB`
   - `API_KEY`
4. Deploy

Konfigurasi routing sudah diatur di `vercel.json` — semua request `/api/*` diarahkan ke satu handler.
