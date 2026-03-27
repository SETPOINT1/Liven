# Liven Smart Community Platform

แพลตฟอร์มชุมชนอัจฉริยะ — **Better Living → Better Community**

ระบบเชื่อมต่อลูกบ้าน นิติบุคคล และผู้พัฒนาโครงการ ผ่าน 3 ส่วนหลัก:

- **Resident App** (React Native) — แอปมือถือสำหรับลูกบ้าน
- **Web Dashboard** (React + Vite) — แดชบอร์ดสำหรับนิติบุคคลและผู้พัฒนาโครงการ
- **Backend API** (Django REST Framework) — เซิร์ฟเวอร์ API กลาง

ใช้ Supabase เป็น Backend-as-a-Service (Auth, Realtime, Storage, PostgreSQL) และ deploy บน AWS EC2 พร้อม Nginx reverse proxy

## โครงสร้างโปรเจกต์

```
liven-smart-community/
├── backend/                # Django REST Framework API
│   ├── accounts/           # การลงทะเบียน, Login, จัดการผู้ใช้
│   ├── facilities/         # สิ่งอำนวยความสะดวกและการจอง
│   ├── parcels/            # พัสดุและ OCR
│   ├── social/             # Social Feed
│   ├── events/             # กิจกรรมและประกาศ
│   ├── chatbot/            # Smart Chatbot (Gemini)
│   ├── analytics/          # Community Health Dashboard
│   ├── notifications/      # การแจ้งเตือน
│   └── liven/              # Django project config
├── frontend-web/           # React + Vite Web Dashboard
├── frontend-mobile/        # React Native Resident App
├── nginx/                  # Nginx reverse proxy configuration
├── deploy/                 # Systemd service files
└── README.md
```

## ฟีเจอร์หลัก

- ลงทะเบียนและจัดการสิทธิ์ผู้ใช้ (Resident / Juristic / Developer)
- หน้าหลักแบบ Widget พร้อมคำแนะนำตามพฤติกรรม
- สถานะสิ่งอำนวยความสะดวกแบบ Real-time + จอง
- จัดการพัสดุด้วย AI OCR (Azure Computer Vision + Typhoon)
- Social Feed ชุมชน (โพสต์, ไลก์, คอมเมนต์, แชร์, รายงาน)
- Smart Chatbot 24/7 (Gemini)
- กิจกรรมและประกาศ (ปกติ / สำคัญ / ฉุกเฉิน)
- Community Health Dashboard พร้อมกราฟสถิติ
- Push Notification แบบอัจฉริยะ

---

## การติดตั้ง Local Development

### ข้อกำหนดเบื้องต้น

- Python 3.10+
- Node.js 18+
- npm หรือ yarn
- Git

### 1. Clone โปรเจกต์

```bash
git clone <repository-url>
cd liven-smart-community
```

### 2. ตั้งค่า Backend (Django)

```bash
cd backend

# สร้าง virtual environment
python3 -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

# ติดตั้ง dependencies
pip install -r requirements.txt

# คัดลอกและแก้ไข .env
cp .env.example .env
# แก้ไขค่าใน .env ตามข้อมูลจริง (ดูหัวข้อ "การตั้งค่า Supabase")

# รัน development server
python manage.py runserver
```

Backend จะรันที่ `http://localhost:8000`

### 3. ตั้งค่า Frontend Web (React + Vite)

```bash
cd frontend-web

# ติดตั้ง dependencies
npm install

# คัดลอกและแก้ไข .env
cp .env.example .env
# แก้ไข VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_BASE_URL

# รัน development server
npm run dev
```

Web Dashboard จะรันที่ `http://localhost:5173`

### 4. ตั้งค่า Frontend Mobile (React Native)

```bash
cd frontend-mobile

# ติดตั้ง dependencies
npm install

# คัดลอกและแก้ไข .env
cp .env.example .env
# แก้ไข SUPABASE_URL, SUPABASE_ANON_KEY, API_BASE_URL

# รัน (Android)
npx react-native run-android

# รัน (iOS)
npx react-native run-ios
```

---

## การตั้งค่า Supabase

### 1. สร้างโปรเจกต์ Supabase

1. ไปที่ [supabase.com](https://supabase.com) → สร้างโปรเจกต์ใหม่
2. เลือก Region: **Singapore** (ใกล้ไทยที่สุด)
3. ตั้ง Database Password → บันทึกไว้

### 2. รัน SQL Migration

ไปที่ Supabase Dashboard → **SQL Editor** → รันไฟล์ `backend/supabase_migration.sql` ทั้งหมด

ไฟล์นี้จะสร้างตารางทั้งหมด: `projects`, `users`, `facilities`, `bookings`, `parcels`, `posts`, `comments`, `likes`, `post_reports`, `events`, `announcements`, `chat_history`, `knowledge_base`, `notifications` พร้อม indexes และ constraints

### 3. เปิด Realtime

ใน Supabase Dashboard → **Database** → **Replication**:
- เปิด Realtime สำหรับตาราง `bookings` (สถานะ Facility)
- เปิด Realtime สำหรับตาราง `notifications` (การแจ้งเตือน)
- เปิด Realtime สำหรับตาราง `posts` (Social Feed)

### 4. สร้าง Storage Buckets

ใน Supabase Dashboard → **Storage** → สร้าง bucket:
- `parcels` (public) — รูปภาพพัสดุ
- `posts` (public) — รูปภาพโพสต์
- `events` (public) — รูปภาพกิจกรรม

หรือรันใน SQL Editor:

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('parcels', 'parcels', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('events', 'events', true);
```

### 5. คัดลอก Keys ไปใส่ .env

ใน Supabase Dashboard → **Settings** → **API**:
- `SUPABASE_URL` → Project URL
- `SUPABASE_ANON_KEY` → anon public key
- `SUPABASE_SERVICE_ROLE_KEY` → service_role key (ใช้เฉพาะ backend)
- `DATABASE_URL` → Connection string (Settings → Database → Connection string → URI)
- `SUPABASE_JWT_SECRET` → JWT Secret (Settings → API → JWT Secret)

---

## การ Deploy บน AWS EC2

### 1. สร้าง EC2 Instance

- เลือก AMI: **Ubuntu 22.04 LTS**
- Instance type: **t2.micro** (free tier) หรือ **t3.small** (แนะนำ)
- Security Group: เปิด port **22** (SSH), **80** (HTTP), **443** (HTTPS)

### 2. SSH เข้า EC2

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 3. ติดตั้ง Dependencies

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install python3-pip python3-venv nginx nodejs npm git -y
```

### 4. Clone และตั้งค่า Backend

```bash
git clone <repository-url> /home/ubuntu/liven
cd /home/ubuntu/liven/backend

# สร้าง virtual environment
python3 -m venv venv
source venv/bin/activate

# ติดตั้ง dependencies
pip install -r requirements.txt

# ตั้งค่า .env สำหรับ production
cp .env.example .env
# แก้ไข .env:
#   DJANGO_DEBUG=False
#   ALLOWED_HOSTS=your-domain.com,your-ec2-ip
#   SUPABASE_URL, SUPABASE_ANON_KEY, etc.

# Collect static files
python manage.py collectstatic --noinput
```

### 5. ตั้งค่า Gunicorn Service

```bash
# คัดลอก systemd service file
sudo cp /home/ubuntu/liven/deploy/liven.service /etc/systemd/system/liven.service

# เปิดใช้งานและเริ่ม service
sudo systemctl daemon-reload
sudo systemctl enable liven
sudo systemctl start liven

# ตรวจสอบสถานะ
sudo systemctl status liven
```

### 6. Build Frontend Web

```bash
cd /home/ubuntu/liven/frontend-web

# ติดตั้ง dependencies
npm install

# ตั้งค่า .env สำหรับ production
cp .env.example .env
# แก้ไข VITE_API_BASE_URL=https://your-domain.com/api

# Build
npm run build

# คัดลอก build ไปยัง Nginx root
sudo mkdir -p /var/www/liven-web
sudo cp -r dist/* /var/www/liven-web/
```

### 7. ตั้งค่า Nginx

```bash
# คัดลอก Nginx config
sudo cp /home/ubuntu/liven/nginx/liven.conf /etc/nginx/sites-available/liven
sudo ln -s /etc/nginx/sites-available/liven /etc/nginx/sites-enabled/

# แก้ไข server_name ใน config
sudo nano /etc/nginx/sites-available/liven
# เปลี่ยน your-domain.com เป็นโดเมนหรือ IP จริง

# ลบ default config (ถ้ามี)
sudo rm -f /etc/nginx/sites-enabled/default

# ทดสอบ config
sudo nginx -t

# รีสตาร์ท Nginx
sudo systemctl restart nginx
```

### 8. ตั้งค่า SSL (แนะนำ)

```bash
# ติดตั้ง Certbot
sudo apt install certbot python3-certbot-nginx -y

# ขอ SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renew
sudo systemctl enable certbot.timer
```

---

## Environment Variables

### Backend (.env)

| ตัวแปร | คำอธิบาย |
|---|---|
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_ANON_KEY` | Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `SUPABASE_JWT_SECRET` | Supabase JWT Secret |
| `DATABASE_URL` | PostgreSQL connection string |
| `DJANGO_SECRET_KEY` | Django secret key |
| `DJANGO_DEBUG` | `True` (dev) / `False` (production) |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts |
| `CORS_ALLOWED_ORIGINS` | Comma-separated CORS origins |
| `GEMINI_API_KEY` | Google Gemini API key |
| `AZURE_CV_ENDPOINT` | Azure Computer Vision endpoint |
| `AZURE_CV_KEY` | Azure Computer Vision key |
| `TYPHOON_API_KEY` | Typhoon API key |

### Frontend Web (.env)

| ตัวแปร | คำอธิบาย |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key |
| `VITE_API_BASE_URL` | Backend API base URL |

### Frontend Mobile (.env)

| ตัวแปร | คำอธิบาย |
|---|---|
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_ANON_KEY` | Supabase anon public key |
| `API_BASE_URL` | Backend API base URL |

---

## เทคโนโลยีที่ใช้

| เทคโนโลยี | การใช้งาน |
|---|---|
| Django REST Framework | Backend API |
| Supabase (PostgreSQL) | Database, Auth, Realtime, Storage |
| React + Vite | Web Dashboard |
| React Native | Mobile App |
| Gemini (free) | Smart Chatbot |
| Azure Computer Vision | OCR สำหรับพัสดุ |
| Typhoon | จัดรูปแบบข้อมูลภาษาไทย |
| Nginx | Reverse proxy |
| Gunicorn | WSGI server |
| AWS EC2 | Hosting |

---

## คำสั่งที่ใช้บ่อย

```bash
# รัน backend tests
cd backend && python manage.py test

# รัน backend server
cd backend && python manage.py runserver

# Build frontend web
cd frontend-web && npm run build

# รัน frontend web dev server
cd frontend-web && npm run dev

# ตรวจสอบ Gunicorn service status (production)
sudo systemctl status liven

# ดู Gunicorn logs (production)
sudo journalctl -u liven -f

# รีสตาร์ท Gunicorn (production)
sudo systemctl restart liven
```
