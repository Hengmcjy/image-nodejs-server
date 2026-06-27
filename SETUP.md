# Image Server — Synology NAS DS923+

Node.js image upload server ที่รันบน Docker  
Port: **3967** | Storage: `/volume1/images` (50 GB)

---

## โครงสร้างไฟล์

```
image-server/
├── server.js               ← entry point
├── routes/images.js        ← API routes
├── middleware/upload.js    ← multer config
├── utils/resize.js         ← sharp resize
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## โครงสร้าง uploads บน NAS

```
/volume1/images/
├── hr/
│   ├── original/   ← .webp คุณภาพ 92%  (ต้นฉบับ)
│   ├── web/        ← max 1280px, quality 85
│   ├── mobile/     ← max 480px,  quality 75
│   └── thumb/      ← 200×200 crop, quality 70
├── accounting/
│   └── ...
└── products/
    └── ...
```

---

## Deploy บน Synology

### 1. เตรียม shared folder
เปิด DSM → File Station → สร้าง shared folder ชื่อ `images`  
(path จะเป็น `/volume1/images`)

### 2. Copy ไฟล์ขึ้น NAS
```bash
scp -r ./image-server admin@192.168.x.x:/volume1/docker/image-server
```

### 3. แก้ docker-compose.yml
```yaml
volumes:
  - /volume1/images:/app/uploads   # ← ตรวจสอบ path บน NAS
```

### 4. Build & Run
```bash
cd /volume1/docker/image-server
docker compose up -d --build
```

### 5. ตรวจสอบ
```bash
curl http://NAS_IP:3967/health
```

---

## API Reference

### Base URL
```
http://NAS_IP:3967
```

Header ถ้าเปิด API_KEY:
```
x-api-key: your-secret-key
```

---

### POST /api/images/upload
อัพโหลดหลายรูปพร้อมกัน

**Request** `multipart/form-data`
| Field      | Type    | Required | Description                    |
|------------|---------|----------|--------------------------------|
| `location` | string  | ✓        | เช่น `/images/hr`             |
| `files[]`  | file(s) | ✓        | รูปภาพ (jpg/png/gif/webp/heic) |

**Response**
```json
{
  "success": true,
  "count": 2,
  "files": [
    {
      "baseName": "1718000000_abc123",
      "original": "/images/hr/original/1718000000_abc123_original.webp",
      "web":      "/images/hr/web/1718000000_abc123_web.webp",
      "mobile":   "/images/hr/mobile/1718000000_abc123_mobile.webp",
      "thumb":    "/images/hr/thumb/1718000000_abc123_thumb.webp",
      "originalName": "photo.jpg"
    }
  ]
}
```

---

### DELETE /api/images/delete
ลบทุก size ของรูปนั้น

**Request** `application/json`
```json
{
  "location": "/images/hr",
  "baseName": "1718000000_abc123"
}
```

**Response**
```json
{
  "success": true,
  "deleted": ["original/1718000000_abc123_original.webp", "web/...", "mobile/...", "thumb/..."]
}
```

---

### DELETE /api/images/delete-file
ลบไฟล์เดียว (size เดียว)

**Request** `application/json`
```json
{
  "location": "/images/hr",
  "size": "web",
  "filename": "1718000000_abc123_web.webp"
}
```

---

### GET /api/images/list
List รูปใน folder

**Query params**
| Param      | Default | Description                         |
|------------|---------|-------------------------------------|
| `location` | —       | เช่น `/images/hr`                  |
| `size`     | `thumb` | original / web / mobile / thumb     |
| `page`     | `1`     | pagination                          |
| `limit`    | `50`    | max 200                             |

```
GET /api/images/list?location=/images/hr&size=thumb&page=1&limit=20
```

---

### GET /api/images/info
ดู URL ทุก size ของรูป

```
GET /api/images/info?location=/images/hr&baseName=1718000000_abc123
```

---

### GET /api/images/folders
List ทุก folder ที่มีอยู่

```
GET /api/images/folders
```

---

### GET /images/:folder/:size/:filename
Serve ไฟล์รูปโดยตรง (static)

```
GET /images/hr/web/1718000000_abc123_web.webp
GET /images/accounting/thumb/1718000001_xyz789_thumb.webp
```

---

### GET /health
Health check + disk usage

---

## ตัวอย่าง Angular Service

```typescript
// image.service.ts
uploadImages(location: string, files: File[]) {
  const fd = new FormData();
  fd.append('location', location);
  files.forEach(f => fd.append('files', f, f.name));
  return this.http.post<any>(`${this.baseUrl}/api/images/upload`, fd);
}

deleteImage(location: string, baseName: string) {
  return this.http.delete(`${this.baseUrl}/api/images/delete`, {
    body: { location, baseName }
  });
}

listImages(location: string, size = 'thumb', page = 1) {
  return this.http.get<any>(`${this.baseUrl}/api/images/list`, {
    params: { location, size, page }
  });
}
```

---

## Image sizes สรุป

| Size     | Max Width | Quality | Format | Use case        |
|----------|-----------|---------|--------|-----------------|
| original | ต้นฉบับ  | 92%     | webp   | full-res backup |
| web      | 1280px    | 85%     | webp   | desktop website |
| mobile   | 480px     | 75%     | webp   | mobile app      |
| thumb    | 200×200   | 70%     | webp   | grid / list     |

---

## Environment Variables

| Variable               | Default        | Description                      |
|------------------------|----------------|----------------------------------|
| `PORT`                 | 3967           | port ที่รัน                     |
| `UPLOAD_BASE_PATH`     | /app/uploads   | path เก็บรูป (volume mount)     |
| `MAX_FILE_SIZE_MB`     | 20             | ขนาดสูงสุดต่อไฟล์ (MB)         |
| `MAX_FILES_PER_REQUEST`| 20             | จำนวนไฟล์สูงสุดต่อ request     |
| `ALLOWED_ORIGINS`      | (ว่าง=ทั้งหมด) | CORS whitelist คั่นด้วย `,`     |
| `API_KEY`              | (ว่าง=ไม่บังคับ)| ถ้า set จะต้องส่ง x-api-key    |
| `SIZE_WEB_WIDTH`       | 1280           | ความกว้าง web size (px)         |
| `SIZE_WEB_QUALITY`     | 85             | คุณภาพ web (1-100)              |
| `SIZE_MOBILE_WIDTH`    | 480            | ความกว้าง mobile size (px)      |
| `SIZE_MOBILE_QUALITY`  | 75             | คุณภาพ mobile (1-100)           |
| `SIZE_THUMB_WIDTH`     | 200            | ความกว้าง thumb (px)            |
| `SIZE_THUMB_HEIGHT`    | 200            | ความสูง thumb (px)              |
| `SIZE_THUMB_QUALITY`   | 70             | คุณภาพ thumb (1-100)            |
