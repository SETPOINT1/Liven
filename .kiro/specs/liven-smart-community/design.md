# เอกสารการออกแบบ (Design Document) — Liven Smart Community Platform

## ภาพรวม (Overview)

Liven เป็นแพลตฟอร์มชุมชนอัจฉริยะที่ออกแบบมาเพื่อเชื่อมต่อลูกบ้าน นิติบุคคล และผู้พัฒนาโครงการ ผ่านระบบที่ประกอบด้วย 3 ส่วนหลัก:

1. **Resident App** (React Native) — แอปมือถือสำหรับลูกบ้าน
2. **Web Dashboard** (React) — แดชบอร์ดสำหรับนิติบุคคลและผู้พัฒนาโครงการ
3. **Backend API** (Django REST Framework) — เซิร์ฟเวอร์ API กลาง

ระบบใช้ Supabase เป็น Backend-as-a-Service สำหรับ Authentication, Realtime subscriptions, Storage และ PostgreSQL database โดย deploy บน AWS EC2 พร้อม Nginx reverse proxy

### เหตุผลในการเลือกเทคโนโลยี

| เทคโนโลยี | เหตุผล |
|---|---|
| Django REST Framework | มี ORM ที่แข็งแกร่ง, มี admin panel ในตัว, เหมาะกับ hackathon ที่ต้องพัฒนาเร็ว |
| Supabase (PostgreSQL) | ฟรี, มี Realtime/Auth/Storage ในตัว, ลดงาน infrastructure |
| React Native | เขียนครั้งเดียวใช้ได้ทั้ง iOS/Android |
| React (Vite) | เร็ว, เบา, เหมาะกับ dashboard |
| Gemini (free) | Chatbot ฟรี, รองรับภาษาไทย |
| Azure Computer Vision + Typhoon | OCR ฟรี (student credits), Typhoon ช่วยจัดรูปแบบภาษาไทย |
| AWS EC2 + Nginx | ควบคุมได้เต็มที่, reverse proxy จัดการ routing |

---

## สถาปัตยกรรม (Architecture)

### System Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        MA[📱 Resident App<br/>React Native]
        WD[🖥️ Web Dashboard<br/>React + Vite]
    end

    subgraph "Reverse Proxy"
        NG[🔀 Nginx<br/>AWS EC2]
    end

    subgraph "Application Layer"
        DJ[⚙️ Django REST API<br/>Gunicorn]
    end

    subgraph "Supabase Cloud"
        SA[🔐 Supabase Auth]
        SR[⚡ Supabase Realtime]
        SS[📦 Supabase Storage]
        PG[(🗄️ PostgreSQL)]
    end

    subgraph "AI/ML Services"
        GM[🤖 Gemini API<br/>Chatbot]
        AZ[👁️ Azure Computer Vision<br/>OCR]
        TY[🌀 Typhoon API<br/>Thai Text Processing]
    end

    MA -->|HTTPS| NG
    WD -->|HTTPS| NG
    NG -->|Proxy Pass| DJ
    NG -->|Static Files| WD

    DJ -->|SQL via Supabase Client| PG
    DJ -->|Auth Verify| SA
    DJ -->|File Upload| SS
    DJ -->|Chatbot Query| GM
    DJ -->|OCR Request| AZ
    DJ -->|Thai Text Fix| TY

    MA -->|Realtime WS| SR
    WD -->|Realtime WS| SR
    MA -->|Auth| SA
    WD -->|Auth| SA

    SR -->|Listen| PG
```

### Request Flow

```mermaid
sequenceDiagram
    participant C as Client (App/Web)
    participant N as Nginx
    participant D as Django API
    participant SB as Supabase
    participant AI as AI Services

    C->>SB: 1. Login (Supabase Auth)
    SB-->>C: JWT Token

    C->>N: 2. API Request + JWT
    N->>D: Proxy Pass
    D->>SB: Verify JWT
    SB-->>D: User Info

    D->>SB: 3. Database Query
    SB-->>D: Data
    D-->>N: JSON Response
    N-->>C: Response

    Note over C,SB: Realtime Updates
    C->>SB: 4. Subscribe to channel
    SB-->>C: Realtime events (WS)
```

### โครงสร้างโปรเจกต์ (Project Structure)

```
liven-smart-community/
├── backend/                          # Django Backend
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── liven/                        # Django Project Config
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── accounts/                     # User & Auth App
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── tests.py
│   ├── facilities/                   # Facility Management App
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── tests.py
│   ├── parcels/                      # Parcel & OCR App
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── tests.py
│   ├── social/                       # Social Feed App
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── tests.py
│   ├── events/                       # Events & Announcements App
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── tests.py
│   ├── chatbot/                      # Chatbot App
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── tests.py
│   ├── analytics/                    # Community Health Analytics App
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── tests.py
│   └── notifications/                # Notification App
│       ├── models.py
│       ├── serializers.py
│       ├── views.py
│       ├── urls.py
│       └── tests.py
│
├── frontend-web/                     # React Web Dashboard
│   ├── package.json
│   ├── vite.config.js
│   ├── .env.example
│   ├── public/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/               # Shared UI Components
│   │   ├── pages/                    # Page Components
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── UsersPage.jsx
│   │   │   ├── ParcelsPage.jsx
│   │   │   ├── EventsPage.jsx
│   │   │   ├── SocialFeedPage.jsx
│   │   │   └── AnalyticsPage.jsx
│   │   ├── hooks/                    # Custom Hooks
│   │   ├── services/                 # API & Supabase Client
│   │   │   ├── api.js
│   │   │   └── supabase.js
│   │   └── utils/
│   └── index.html
│
├── frontend-mobile/                  # React Native App
│   ├── package.json
│   ├── app.json
│   ├── .env.example
│   ├── App.jsx
│   ├── src/
│   │   ├── navigation/              # React Navigation
│   │   │   └── AppNavigator.jsx
│   │   ├── screens/                  # Screen Components
│   │   │   ├── LoginScreen.jsx
│   │   │   ├── HomeScreen.jsx
│   │   │   ├── FacilityScreen.jsx
│   │   │   ├── ParcelScreen.jsx
│   │   │   ├── SocialFeedScreen.jsx
│   │   │   ├── ChatbotScreen.jsx
│   │   │   └── EventsScreen.jsx
│   │   ├── components/               # Shared Components
│   │   │   └── widgets/
│   │   ├── hooks/
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── supabase.js
│   │   └── utils/
│   └── index.js
│
├── nginx/
│   └── liven.conf                    # Nginx Configuration
├── .gitignore
└── README.md
```

### Environment Variables (.env.example)

**Backend (.env.example):**
```
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# Django
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# AI Services
GEMINI_API_KEY=your-gemini-api-key
AZURE_CV_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_CV_KEY=your-azure-cv-key
TYPHOON_API_KEY=your-typhoon-api-key
```

**Frontend (.env.example):**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## ส่วนประกอบและอินเทอร์เฟซ (Components and Interfaces)

### Backend Django Apps

#### 1. accounts App
- จัดการ User model, Registration, Role-based access
- Endpoints:
  - `POST /api/auth/register/` — ลงทะเบียนผู้ใช้ใหม่
  - `GET /api/auth/me/` — ดึงข้อมูลผู้ใช้ปัจจุบัน
  - `GET /api/users/` — รายการผู้ใช้ (Juristic only)
  - `PATCH /api/users/{id}/approve/` — อนุมัติผู้ใช้
  - `PATCH /api/users/{id}/reject/` — ปฏิเสธผู้ใช้
  - `PATCH /api/users/{id}/role/` — เปลี่ยนบทบาท

#### 2. facilities App
- จัดการ Facility, Booking, สถานะ real-time
- Endpoints:
  - `GET /api/facilities/` — รายการสิ่งอำนวยความสะดวก
  - `GET /api/facilities/{id}/status/` — สถานะปัจจุบัน
  - `POST /api/facilities/{id}/book/` — จองสิ่งอำนวยความสะดวก
  - `GET /api/bookings/` — รายการการจอง

#### 3. parcels App
- จัดการพัสดุ, OCR processing
- Endpoints:
  - `GET /api/parcels/` — รายการพัสดุ
  - `POST /api/parcels/` — บันทึกพัสดุใหม่
  - `POST /api/parcels/ocr/` — OCR scan ใบปะหน้าพัสดุ
  - `PATCH /api/parcels/{id}/pickup/` — ยืนยันรับพัสดุ

#### 4. social App
- จัดการ Social Feed, Posts, Comments, Likes
- Endpoints:
  - `GET /api/posts/` — รายการโพสต์ (feed)
  - `POST /api/posts/` — สร้างโพสต์ใหม่
  - `POST /api/posts/{id}/like/` — กดไลก์
  - `POST /api/posts/{id}/comments/` — คอมเมนต์
  - `POST /api/posts/{id}/report/` — รายงานโพสต์
  - `GET /api/posts/{id}/share-link/` — สร้างลิงก์แชร์

#### 5. events App
- จัดการกิจกรรมและประกาศ
- Endpoints:
  - `GET /api/events/` — รายการกิจกรรม
  - `POST /api/events/` — สร้างกิจกรรม (Juristic only)
  - `GET /api/announcements/` — รายการประกาศ
  - `POST /api/announcements/` — สร้างประกาศ (Juristic only)

#### 6. chatbot App
- จัดการ Chatbot conversations
- Endpoints:
  - `POST /api/chatbot/message/` — ส่งข้อความถาม chatbot
  - `GET /api/chatbot/history/` — ประวัติการสนทนา

#### 7. analytics App
- Community Health Dashboard data
- Endpoints:
  - `GET /api/analytics/community-health/` — ข้อมูลสุขภาพชุมชน
  - `GET /api/analytics/facility-usage/` — สถิติการใช้ facility
  - `GET /api/analytics/parcel-stats/` — สถิติพัสดุ
  - `GET /api/analytics/chatbot-trends/` — แนวโน้มคำถาม chatbot

#### 8. notifications App
- จัดการ Push Notifications
- Endpoints:
  - `GET /api/notifications/` — รายการแจ้งเตือน
  - `PATCH /api/notifications/{id}/read/` — อ่านแจ้งเตือน

### Class Diagram

```mermaid
classDiagram
    class User {
        +UUID id
        +String email
        +String full_name
        +String phone
        +String unit_number
        +Enum role [resident, juristic, developer]
        +Enum status [pending, approved, rejected, suspended]
        +UUID project_id
        +DateTime created_at
        +register()
        +approve()
        +reject()
        +suspend()
    }

    class Project {
        +UUID id
        +String name
        +String address
        +String description
        +DateTime created_at
    }

    class Facility {
        +UUID id
        +UUID project_id
        +String name
        +Enum type [fitness, parking, meeting_room, pool, garden]
        +String description
        +String operating_hours
        +Boolean is_active
        +get_current_status()
    }

    class Booking {
        +UUID id
        +UUID facility_id
        +UUID user_id
        +DateTime start_time
        +DateTime end_time
        +Enum status [confirmed, cancelled]
        +DateTime created_at
        +cancel()
    }

    class Parcel {
        +UUID id
        +UUID project_id
        +UUID resident_id
        +String recipient_name
        +String unit_number
        +String courier
        +String tracking_number
        +Enum status [pending, picked_up]
        +String image_url
        +DateTime arrived_at
        +DateTime picked_up_at
        +Float ocr_confidence
        +confirm_pickup()
    }

    class Post {
        +UUID id
        +UUID author_id
        +UUID project_id
        +Enum post_type [normal, announcement, alert]
        +String content
        +String image_url
        +Boolean is_pinned
        +String share_token
        +DateTime created_at
        +like()
        +comment()
        +report()
        +generate_share_link()
    }

    class Comment {
        +UUID id
        +UUID post_id
        +UUID author_id
        +String content
        +DateTime created_at
    }

    class Like {
        +UUID id
        +UUID post_id
        +UUID user_id
        +DateTime created_at
    }

    class Event {
        +UUID id
        +UUID project_id
        +UUID created_by
        +String title
        +String description
        +DateTime event_date
        +String location
        +String image_url
        +DateTime created_at
    }

    class Announcement {
        +UUID id
        +UUID project_id
        +UUID created_by
        +String title
        +String content
        +Enum priority [normal, important, emergency]
        +DateTime expires_at
        +DateTime created_at
    }

    class ChatHistory {
        +UUID id
        +UUID user_id
        +UUID session_id
        +String user_message
        +String bot_response
        +Boolean is_escalated
        +DateTime created_at
    }

    class KnowledgeBase {
        +UUID id
        +UUID project_id
        +String category
        +String question
        +String answer
        +DateTime updated_at
    }

    class Notification {
        +UUID id
        +UUID user_id
        +Enum type [parcel, announcement, event, approval, report]
        +String title
        +String body
        +Boolean is_read
        +JSON data
        +DateTime created_at
        +mark_as_read()
    }

    class PostReport {
        +UUID id
        +UUID post_id
        +UUID reported_by
        +String reason
        +Enum status [pending, reviewed, dismissed]
        +DateTime created_at
    }

    Project "1" --> "*" User : has members
    Project "1" --> "*" Facility : has
    Project "1" --> "*" Post : contains
    Project "1" --> "*" Event : hosts
    Project "1" --> "*" Announcement : publishes
    Project "1" --> "*" KnowledgeBase : maintains

    User "1" --> "*" Booking : makes
    User "1" --> "*" Post : creates
    User "1" --> "*" Comment : writes
    User "1" --> "*" Like : gives
    User "1" --> "*" ChatHistory : has
    User "1" --> "*" Notification : receives
    User "1" --> "*" Parcel : owns

    Facility "1" --> "*" Booking : has
    Post "1" --> "*" Comment : has
    Post "1" --> "*" Like : has
    Post "1" --> "*" PostReport : has
```

### Frontend Components

#### Resident App (React Native) — หน้าจอหลัก
- **HomeScreen**: หน้าหลักแบบ Widget (FacilityWidget, ParcelWidget, NewsWidget, FeedWidget)
- **FacilityScreen**: แสดงสถานะ Facility แบบ real-time + จอง
- **ParcelScreen**: รายการพัสดุ + สถานะ
- **SocialFeedScreen**: Social Feed + โพสต์/ไลก์/คอมเมนต์
- **ChatbotScreen**: หน้าแชท chatbot
- **EventsScreen**: กิจกรรมและประกาศ
- **ProfileScreen**: โปรไฟล์ผู้ใช้

#### Web Dashboard (React) — หน้าจอหลัก
- **DashboardPage**: Community Health Overview + กราฟ
- **UsersPage**: จัดการผู้ใช้ + อนุมัติ/ปฏิเสธ
- **ParcelsPage**: จัดการพัสดุ + OCR scan
- **SocialFeedPage**: จัดการโพสต์ + ตรวจสอบรายงาน
- **EventsPage**: สร้าง/จัดการกิจกรรมและประกาศ
- **AnalyticsPage**: กราฟสถิติเชิงลึก

---

## แบบจำลองข้อมูล (Data Models)

### ER Diagram

```mermaid
erDiagram
    PROJECT {
        uuid id PK
        varchar name
        varchar address
        text description
        timestamp created_at
    }

    USER {
        uuid id PK
        uuid supabase_uid UK
        varchar email UK
        varchar full_name
        varchar phone
        varchar unit_number
        varchar role
        varchar status
        uuid project_id FK
        timestamp created_at
        timestamp updated_at
    }

    FACILITY {
        uuid id PK
        uuid project_id FK
        varchar name
        varchar type
        text description
        varchar operating_hours
        boolean is_active
        timestamp created_at
    }

    BOOKING {
        uuid id PK
        uuid facility_id FK
        uuid user_id FK
        timestamp start_time
        timestamp end_time
        varchar status
        timestamp created_at
    }

    PARCEL {
        uuid id PK
        uuid project_id FK
        uuid resident_id FK
        uuid registered_by FK
        varchar recipient_name
        varchar unit_number
        varchar courier
        varchar tracking_number
        varchar status
        varchar image_url
        timestamp arrived_at
        timestamp picked_up_at
        float ocr_confidence
        timestamp created_at
    }

    POST {
        uuid id PK
        uuid author_id FK
        uuid project_id FK
        varchar post_type
        text content
        varchar image_url
        boolean is_pinned
        varchar share_token UK
        timestamp created_at
    }

    COMMENT {
        uuid id PK
        uuid post_id FK
        uuid author_id FK
        text content
        timestamp created_at
    }

    LIKE_TABLE {
        uuid id PK
        uuid post_id FK
        uuid user_id FK
        timestamp created_at
    }

    POST_REPORT {
        uuid id PK
        uuid post_id FK
        uuid reported_by FK
        text reason
        varchar status
        timestamp created_at
    }

    EVENT {
        uuid id PK
        uuid project_id FK
        uuid created_by FK
        varchar title
        text description
        timestamp event_date
        varchar location
        varchar image_url
        timestamp created_at
    }

    ANNOUNCEMENT {
        uuid id PK
        uuid project_id FK
        uuid created_by FK
        varchar title
        text content
        varchar priority
        timestamp expires_at
        timestamp created_at
    }

    CHAT_HISTORY {
        uuid id PK
        uuid user_id FK
        uuid session_id
        text user_message
        text bot_response
        boolean is_escalated
        timestamp created_at
    }

    KNOWLEDGE_BASE {
        uuid id PK
        uuid project_id FK
        varchar category
        text question
        text answer
        timestamp updated_at
    }

    NOTIFICATION {
        uuid id PK
        uuid user_id FK
        varchar type
        varchar title
        text body
        boolean is_read
        jsonb data
        timestamp created_at
    }

    PROJECT ||--o{ USER : "has members"
    PROJECT ||--o{ FACILITY : "has"
    PROJECT ||--o{ POST : "contains"
    PROJECT ||--o{ EVENT : "hosts"
    PROJECT ||--o{ ANNOUNCEMENT : "publishes"
    PROJECT ||--o{ KNOWLEDGE_BASE : "maintains"
    PROJECT ||--o{ PARCEL : "receives"

    USER ||--o{ BOOKING : "makes"
    USER ||--o{ POST : "creates"
    USER ||--o{ COMMENT : "writes"
    USER ||--o{ LIKE_TABLE : "gives"
    USER ||--o{ CHAT_HISTORY : "has"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ PARCEL : "owns"
    USER ||--o{ POST_REPORT : "reports"
    USER ||--o{ EVENT : "creates"
    USER ||--o{ ANNOUNCEMENT : "creates"
    USER ||--o{ PARCEL : "registers"

    FACILITY ||--o{ BOOKING : "has"
    POST ||--o{ COMMENT : "has"
    POST ||--o{ LIKE_TABLE : "has"
    POST ||--o{ POST_REPORT : "has"

```

### Supabase Database Setup

#### 1. สร้างโปรเจกต์ Supabase
1. ไปที่ [supabase.com](https://supabase.com) → สร้างโปรเจกต์ใหม่
2. เลือก Region: Singapore (ใกล้ไทยที่สุด)
3. ตั้ง Database Password → บันทึกไว้ใน .env

#### 2. สร้างตาราง (SQL Migration)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supabase_uid UUID UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    unit_number VARCHAR(50),
    role VARCHAR(20) DEFAULT 'resident' CHECK (role IN ('resident', 'juristic', 'developer')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
    project_id UUID REFERENCES projects(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Facilities
CREATE TABLE facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('fitness', 'parking', 'meeting_room', 'pool', 'garden')),
    description TEXT,
    operating_hours VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID REFERENCES facilities(id) NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Parcels
CREATE TABLE parcels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) NOT NULL,
    resident_id UUID REFERENCES users(id),
    registered_by UUID REFERENCES users(id),
    recipient_name VARCHAR(255),
    unit_number VARCHAR(50),
    courier VARCHAR(100),
    tracking_number VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'picked_up')),
    image_url TEXT,
    arrived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    picked_up_at TIMESTAMP WITH TIME ZONE,
    ocr_confidence FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Posts
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES users(id) NOT NULL,
    project_id UUID REFERENCES projects(id) NOT NULL,
    post_type VARCHAR(20) DEFAULT 'normal' CHECK (post_type IN ('normal', 'announcement', 'alert')),
    content TEXT NOT NULL,
    image_url TEXT,
    is_pinned BOOLEAN DEFAULT FALSE,
    share_token VARCHAR(64) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES users(id) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Likes
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- Post Reports
CREATE TABLE post_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    reported_by UUID REFERENCES users(id) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) NOT NULL,
    created_by UUID REFERENCES users(id) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Announcements
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) NOT NULL,
    created_by UUID REFERENCES users(id) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'emergency')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat History
CREATE TABLE chat_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) NOT NULL,
    session_id UUID NOT NULL,
    user_message TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    is_escalated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge Base
CREATE TABLE knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) NOT NULL,
    category VARCHAR(100),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('parcel', 'announcement', 'event', 'approval', 'report')),
    title VARCHAR(255) NOT NULL,
    body TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_project ON users(project_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_bookings_facility ON bookings(facility_id);
CREATE INDEX idx_bookings_time ON bookings(start_time, end_time);
CREATE INDEX idx_parcels_resident ON parcels(resident_id);
CREATE INDEX idx_parcels_status ON parcels(status);
CREATE INDEX idx_posts_project ON posts(project_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_chat_history_user ON chat_history(user_id);
```

#### 3. เปิด Realtime
ใน Supabase Dashboard → Database → Replication:
- เปิด Realtime สำหรับตาราง `bookings` (สถานะ Facility)
- เปิด Realtime สำหรับตาราง `notifications` (การแจ้งเตือน)
- เปิด Realtime สำหรับตาราง `posts` (Social Feed)

#### 4. ตั้งค่า Storage Buckets
```sql
-- สร้าง bucket สำหรับเก็บรูปภาพ
INSERT INTO storage.buckets (id, name, public) VALUES ('parcels', 'parcels', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('events', 'events', true);
```

#### 5. Row Level Security (RLS)
```sql
-- ตัวอย่าง RLS สำหรับ posts
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view posts in their project" ON posts
    FOR SELECT USING (
        project_id IN (SELECT project_id FROM users WHERE supabase_uid = auth.uid())
    );

CREATE POLICY "Authenticated users can create posts" ON posts
    FOR INSERT WITH CHECK (
        author_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid() AND status = 'approved')
    );
```

### venv และ .env Setup

#### Backend Setup
```bash
# สร้าง virtual environment
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# ติดตั้ง dependencies
pip install django djangorestframework
pip install supabase python-dotenv
pip install google-generativeai  # Gemini
pip install azure-cognitiveservices-vision-computervision  # Azure CV
pip install requests gunicorn pillow
pip install django-cors-headers

# สร้าง requirements.txt
pip freeze > requirements.txt

# คัดลอก .env
cp .env.example .env
# แก้ไขค่าใน .env ตามข้อมูลจริง
```

#### Frontend Web Setup
```bash
cd frontend-web
npm create vite@latest . -- --template react
npm install @supabase/supabase-js axios react-router-dom
npm install recharts  # สำหรับกราฟ
npm install @headlessui/react  # UI components

cp .env.example .env
```

#### Frontend Mobile Setup
```bash
cd frontend-mobile
npx react-native init LivenApp
npm install @supabase/supabase-js axios
npm install @react-navigation/native @react-navigation/bottom-tabs
npm install react-native-push-notification

cp .env.example .env
```

---

### AWS EC2 Deployment Plan

```mermaid
graph LR
    subgraph "AWS EC2 Instance (t2.micro/t3.small)"
        NG2[Nginx :80/:443]
        GU[Gunicorn :8000]
        RC[React Build<br/>/var/www/liven-web]
    end

    Internet -->|HTTP/HTTPS| NG2
    NG2 -->|/api/*| GU
    NG2 -->|/*| RC
    GU --> DJ2[Django App]
```

#### Nginx Configuration (nginx/liven.conf)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # React Web Dashboard
    location / {
        root /var/www/liven-web;
        try_files $uri $uri/ /index.html;
    }

    # Django API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Django Admin
    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Static files (Django)
    location /static/ {
        alias /home/ubuntu/liven/backend/staticfiles/;
    }
}
```

#### Deployment Steps
```bash
# 1. SSH เข้า EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# 2. ติดตั้ง dependencies
sudo apt update && sudo apt upgrade -y
sudo apt install python3-pip python3-venv nginx nodejs npm -y

# 3. Clone project
git clone your-repo-url /home/ubuntu/liven
cd /home/ubuntu/liven

# 4. Setup Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # แก้ไขค่าจริง
python manage.py collectstatic --noinput

# 5. Setup Gunicorn service
sudo tee /etc/systemd/system/liven.service > /dev/null <<EOF
[Unit]
Description=Liven Django App
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/liven/backend
ExecStart=/home/ubuntu/liven/backend/venv/bin/gunicorn liven.wsgi:application --bind 127.0.0.1:8000 --workers 3
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable liven
sudo systemctl start liven

# 6. Build Frontend Web
cd /home/ubuntu/liven/frontend-web
npm install && npm run build
sudo cp -r dist/* /var/www/liven-web/

# 7. Setup Nginx
sudo cp /home/ubuntu/liven/nginx/liven.conf /etc/nginx/sites-available/liven
sudo ln -s /etc/nginx/sites-available/liven /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

### UX/UI Design Principles

1. **Simplicity First**: UI ต้องเรียบง่าย ใช้งานง่าย ลูกบ้านทุกวัยเข้าถึงได้
2. **Consistent Design System**: ใช้ color palette และ typography เดียวกันทั้ง App และ Web
3. **Widget-Based Home**: หน้าหลักแบบ Widget ให้ข้อมูลสำคัญในมุมมองเดียว
4. **Real-time Feedback**: แสดงสถานะ loading, success, error ชัดเจน
5. **Accessibility**: รองรับ font size ใหญ่, contrast ratio ที่ดี, touch target ≥ 44px
6. **Thai-First**: UI ภาษาไทยเป็นหลัก รองรับภาษาอังกฤษ

#### Color Palette
- Primary: `#4CAF50` (เขียว — สื่อถึง community, living)
- Secondary: `#2196F3` (ฟ้า — สื่อถึง smart, technology)
- Background: `#F5F5F5`
- Text: `#212121`
- Error: `#F44336`
- Success: `#4CAF50`

---

## คุณสมบัติความถูกต้อง (Correctness Properties)

*คุณสมบัติ (Property) คือลักษณะหรือพฤติกรรมที่ควรเป็นจริงในทุกการทำงานที่ถูกต้องของระบบ — เป็นข้อกำหนดเชิงรูปนัยเกี่ยวกับสิ่งที่ระบบควรทำ Properties ทำหน้าที่เป็นสะพานเชื่อมระหว่าง specification ที่มนุษย์อ่านได้ กับการรับประกันความถูกต้องที่เครื่องตรวจสอบได้*

### Property 1: การลงทะเบียนสร้างผู้ใช้สถานะ pending พร้อมแจ้งเตือน

*For any* ข้อมูลลงทะเบียนที่ถูกต้อง (ชื่อ อีเมล เบอร์โทร หมายเลขห้อง) เมื่อลงทะเบียนสำเร็จ ระบบจะต้องสร้างผู้ใช้ที่มีสถานะ "pending" และสร้าง notification สำหรับนิติบุคคลของโครงการนั้น

**Validates: Requirements 1.1, 1.2**

### Property 2: การ validate ข้อมูลลงทะเบียนที่ไม่ถูกต้อง

*For any* แบบฟอร์มลงทะเบียนที่มีฟิลด์ว่างหรือรูปแบบไม่ถูกต้อง (เช่น อีเมลผิดรูปแบบ เบอร์โทรไม่ใช่ตัวเลข) ระบบจะต้องปฏิเสธการลงทะเบียนและส่งกลับข้อความ error ที่ระบุฟิลด์ที่ผิดพลาด โดยจำนวนผู้ใช้ในระบบต้องไม่เปลี่ยนแปลง

**Validates: Requirements 1.3**

### Property 3: การ login ส่งกลับบทบาทที่ถูกต้อง

*For any* ผู้ใช้ที่มีสถานะ "approved" เมื่อ login ด้วย credentials ที่ถูกต้อง ระบบจะต้องส่งกลับข้อมูลที่มี role ตรงกับบทบาทที่กำหนดไว้ในฐานข้อมูล (resident, juristic, หรือ developer)

**Validates: Requirements 2.1**

### Property 4: การเปลี่ยนสถานะผู้ใช้ (อนุมัติ/ปฏิเสธ/ระงับ)

*For any* ผู้ใช้ที่มีสถานะ "pending" เมื่อนิติบุคคลอนุมัติหรือปฏิเสธ สถานะจะต้องเปลี่ยนเป็น "approved" หรือ "rejected" ตามลำดับ และสร้าง notification สำหรับผู้ใช้นั้น นอกจากนี้ เมื่อระงับบัญชี สิทธิ์การเข้าถึง API ของผู้ใช้นั้นจะต้องถูกปฏิเสธทันที

**Validates: Requirements 3.1, 3.2, 3.4**

### Property 5: รายการผู้ใช้มีข้อมูลครบถ้วน

*For any* โปรเจกต์ เมื่อดึงรายการผู้ใช้ ทุก record จะต้องมีฟิลด์ status, role, และ unit_number

**Validates: Requirements 3.3**

### Property 6: สถานะ Facility ตรงกับข้อมูลการจอง

*For any* Facility และ *for any* ช่วงเวลา สถานะจะต้องเป็น "ไม่ว่าง" ก็ต่อเมื่อมี Booking ที่มีสถานะ "confirmed" ที่ช่วงเวลาทับซ้อนกับเวลาปัจจุบัน มิฉะนั้นสถานะจะต้องเป็น "ว่าง"

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 7: การบันทึกพัสดุสร้าง notification ให้เจ้าของ

*For any* ข้อมูลพัสดุที่ถูกต้อง เมื่อบันทึกเข้าระบบ จะต้องสร้าง notification ประเภท "parcel" สำหรับ resident ที่เป็นเจ้าของพัสดุนั้น

**Validates: Requirements 6.1, 9.3**

### Property 8: รายการพัสดุของ Resident มีข้อมูลครบถ้วน

*For any* Resident เมื่อดึงรายการพัสดุ ทุก record จะต้องมีฟิลด์ status, arrived_at, และ image_url และทุก record จะต้องเป็นพัสดุที่เป็นของ Resident คนนั้นเท่านั้น

**Validates: Requirements 6.2**

### Property 9: การยืนยันรับพัสดุ (Pickup Round Trip)

*For any* พัสดุที่มีสถานะ "pending" เมื่อยืนยันการรับ สถานะจะต้องเปลี่ยนเป็น "picked_up" และ picked_up_at จะต้องไม่เป็น null

**Validates: Requirements 6.3**

### Property 10: การเผยแพร่ประกาศ/กิจกรรมสร้าง notification ให้ทุกคนในโครงการ

*For any* ประกาศหรือกิจกรรมที่เผยแพร่ จำนวน notification ที่สร้างจะต้องเท่ากับจำนวน Resident ที่มีสถานะ "approved" ในโครงการนั้น

**Validates: Requirements 6.4, 10.3**

### Property 11: การสร้างโพสต์และการมองเห็นภายในโครงการ

*For any* โพสต์ที่สร้างโดย Resident หรือ Juristic ในโครงการหนึ่ง โพสต์นั้นจะต้องปรากฏใน feed ของทุกผู้ใช้ในโครงการเดียวกัน และจะต้องไม่ปรากฏใน feed ของผู้ใช้โครงการอื่น

**Validates: Requirements 7.1, 7.2, 7.7**

### Property 12: Like เป็น idempotent ต่อผู้ใช้

*For any* โพสต์และ *for any* ผู้ใช้ การกดไลก์ซ้ำจะต้องไม่เพิ่มจำนวนไลก์ (unique constraint: post_id + user_id)

**Validates: Requirements 7.3**

### Property 13: Share link เป็น unique และเข้าถึงได้เฉพาะผู้ที่ authenticated

*For any* โพสต์ เมื่อสร้าง share link จะต้องได้ token ที่ไม่ซ้ำกัน และเมื่อเข้าถึงด้วย token นั้น ผู้ใช้ที่ authenticated จะต้องเห็นเนื้อหาโพสต์ ส่วนผู้ที่ไม่ authenticated จะต้องถูกปฏิเสธ

**Validates: Requirements 7.4, 7.5**

### Property 14: โพสต์ประเภท alert ถูกปักหมุดที่ด้านบน feed

*For any* Social Feed ที่มีโพสต์ประเภท "alert" โพสต์ alert จะต้องปรากฏก่อนโพสต์ประเภทอื่นเสมอ

**Validates: Requirements 7.8**

### Property 15: การรายงานโพสต์สร้าง notification ให้นิติบุคคล

*For any* โพสต์ที่ถูกรายงาน ระบบจะต้องสร้าง notification ประเภท "report" สำหรับนิติบุคคลของโครงการนั้น

**Validates: Requirements 7.9**

### Property 16: ประวัติ Chatbot ถูกบันทึกทุกครั้ง

*For any* ข้อความที่ส่งไปยัง Chatbot ระบบจะต้องสร้าง ChatHistory record ที่มี user_message และ bot_response ไม่เป็นค่าว่าง

**Validates: Requirements 8.4, 8.5**

### Property 17: OCR ที่มี confidence >= 60% ส่งกลับข้อมูลครบ

*For any* ผลลัพธ์ OCR ที่มี confidence >= 60% ระบบจะต้องส่งกลับข้อมูลที่มีฟิลด์ recipient_name, unit_number, courier, และ tracking_number

**Validates: Requirements 9.2**

### Property 18: กิจกรรมและประกาศมีข้อมูลครบถ้วนตามที่กำหนด

*For any* กิจกรรมที่สร้าง จะต้องมีฟิลด์ title, description, event_date, location และ *for any* ประกาศที่สร้าง จะต้องมีฟิลด์ title, content, priority

**Validates: Requirements 10.1, 10.2**

### Property 19: การเรียงลำดับกิจกรรมและประกาศ

*For any* รายการกิจกรรมและประกาศ ลำดับจะต้องเรียงตามระดับความสำคัญ (emergency > important > normal) ก่อน แล้วจึงเรียงตามวันที่ล่าสุด

**Validates: Requirements 10.4**

### Property 20: ข้อมูล Analytics ถูกกรองตามช่วงเวลา

*For any* ช่วงเวลาที่กำหนด (start_date, end_date) ข้อมูลทั้งหมดที่ส่งกลับจาก analytics API (facility usage, parcel stats, chatbot trends) จะต้องมี timestamp อยู่ภายในช่วงเวลานั้น

**Validates: Requirements 11.2, 11.3, 11.4, 11.5**

### Property 21: Community Health มีข้อมูลครบถ้วน

*For any* โปรเจกต์ เมื่อดึงข้อมูล Community Health จะต้องมีฟิลด์ engagement_level, facility_stats, และ chatbot_trends และอัตราความพึงพอใจจะต้องเป็นค่าระหว่าง 0-100

**Validates: Requirements 11.1, 11.6**

### Property 22: CRUD round trip สำหรับทุก model

*For any* model ในระบบ (User, Facility, Parcel, Post, Event, Announcement) เมื่อสร้าง (Create) แล้วอ่าน (Read) จะต้องได้ข้อมูลเดียวกันกลับมา

**Validates: Requirements 12.2**

---

## การจัดการข้อผิดพลาด (Error Handling)

### Backend API Error Responses

ทุก API endpoint จะส่งกลับ error response ในรูปแบบเดียวกัน:

```json
{
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "ข้อมูลไม่ถูกต้อง",
        "details": {
            "email": ["อีเมลไม่ถูกต้อง"],
            "phone": ["กรุณากรอกเบอร์โทรศัพท์"]
        }
    }
}
```

### HTTP Status Codes

| Status Code | ใช้เมื่อ |
|---|---|
| 200 | สำเร็จ |
| 201 | สร้างข้อมูลสำเร็จ |
| 400 | ข้อมูลไม่ถูกต้อง (validation error) |
| 401 | ไม่ได้ login หรือ token หมดอายุ |
| 403 | ไม่มีสิทธิ์เข้าถึง (role ไม่ตรง) |
| 404 | ไม่พบข้อมูล |
| 409 | ข้อมูลซ้ำ (เช่น อีเมลซ้ำ, ไลก์ซ้ำ) |
| 500 | Server error |

### Error Handling Strategy แยกตามส่วน

#### 1. Authentication Errors
- JWT token หมดอายุ → ส่ง 401, client ทำ token refresh ผ่าน Supabase
- บัญชีถูกระงับ → ส่ง 403 พร้อมข้อความ "บัญชีถูกระงับ"
- บัญชีรอการอนุมัติ → ส่ง 403 พร้อมข้อความ "บัญชียังไม่ได้รับการอนุมัติ"

#### 2. OCR Errors
- Azure CV ไม่สามารถอ่านภาพ → ส่ง confidence = 0, แสดงฟอร์มว่าง
- Azure CV timeout → retry 1 ครั้ง, ถ้ายังไม่สำเร็จ → แสดงฟอร์มว่างให้กรอกเอง
- Typhoon API error → ใช้ข้อมูล OCR ดิบโดยไม่ผ่าน Typhoon

#### 3. Chatbot Errors
- Gemini API timeout/error → ส่งข้อความ "ขออภัย ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง"
- Gemini ไม่สามารถตอบได้ → ตั้ง is_escalated = true, แจ้ง Resident ว่าจะส่งต่อนิติบุคคล

#### 4. File Upload Errors
- ไฟล์ใหญ่เกิน 5MB → ส่ง 400 พร้อมข้อความ "ไฟล์ใหญ่เกินกำหนด"
- ประเภทไฟล์ไม่รองรับ → ส่ง 400 พร้อมข้อความ "รองรับเฉพาะ JPG, PNG"
- Supabase Storage error → retry 1 ครั้ง, ถ้ายังไม่สำเร็จ → ส่ง 500

#### 5. Realtime Connection Errors
- Supabase Realtime disconnect → client auto-reconnect ด้วย exponential backoff
- ข้อมูลไม่ sync → client ทำ full refresh เมื่อ reconnect สำเร็จ

#### 6. Notification Errors
- Push notification ส่งไม่สำเร็จ → บันทึก notification ในฐานข้อมูลเสมอ (ผู้ใช้ดูได้ใน app)
- ไม่มี device token → ข้าม push, เก็บเฉพาะ in-app notification

---

## กลยุทธ์การทดสอบ (Testing Strategy)

### แนวทางการทดสอบแบบคู่ (Dual Testing Approach)

ระบบ Liven ใช้การทดสอบ 2 แบบควบคู่กัน:

1. **Unit Tests** — ทดสอบตัวอย่างเฉพาะ, edge cases, และ error conditions
2. **Property-Based Tests** — ทดสอบคุณสมบัติสากลที่ต้องเป็นจริงกับทุก input

ทั้งสองแบบเสริมกัน: Unit tests จับ bug เฉพาะจุด, Property tests ตรวจสอบความถูกต้องทั่วไป

### Property-Based Testing Configuration

- **Library**: [Hypothesis](https://hypothesis.readthedocs.io/) สำหรับ Python/Django
- **Iterations**: ขั้นต่ำ 100 iterations ต่อ property test
- **Tag Format**: `Feature: liven-smart-community, Property {number}: {property_text}`

#### ตัวอย่าง Property Test

```python
from hypothesis import given, strategies as st, settings

# Feature: liven-smart-community, Property 2: การ validate ข้อมูลลงทะเบียนที่ไม่ถูกต้อง
@settings(max_examples=100)
@given(
    email=st.text(min_size=1, max_size=50).filter(lambda x: '@' not in x),  # invalid email
    full_name=st.text(min_size=0, max_size=0),  # empty name
)
def test_invalid_registration_rejected(email, full_name):
    """For any registration form with invalid fields, the system should reject it."""
    data = {"email": email, "full_name": full_name, "phone": "", "unit_number": ""}
    response = register_user(data)
    assert response.status_code == 400
    assert "error" in response.json()
```

```python
# Feature: liven-smart-community, Property 6: สถานะ Facility ตรงกับข้อมูลการจอง
@settings(max_examples=100)
@given(
    facility=facility_strategy(),
    bookings=st.lists(booking_strategy(), min_size=0, max_size=10),
    check_time=st.datetimes()
)
def test_facility_status_matches_bookings(facility, bookings, check_time):
    """For any facility and time, status should match booking overlap."""
    has_overlap = any(
        b.start_time <= check_time <= b.end_time and b.status == 'confirmed'
        for b in bookings
    )
    status = get_facility_status(facility, check_time)
    assert status == ('occupied' if has_overlap else 'available')
```

```python
# Feature: liven-smart-community, Property 22: CRUD round trip สำหรับทุก model
@settings(max_examples=100)
@given(post_data=post_strategy())
def test_post_crud_round_trip(post_data):
    """For any valid post data, create then read should return the same data."""
    created = create_post(post_data)
    retrieved = get_post(created['id'])
    assert retrieved['content'] == post_data['content']
    assert retrieved['post_type'] == post_data['post_type']
```

### แต่ละ Correctness Property ต้องถูก implement ด้วย property-based test เดียว

| Property | Test File | Test Function |
|---|---|---|
| Property 1 | `accounts/tests.py` | `test_registration_creates_pending_user_with_notification` |
| Property 2 | `accounts/tests.py` | `test_invalid_registration_rejected` |
| Property 3 | `accounts/tests.py` | `test_login_returns_correct_role` |
| Property 4 | `accounts/tests.py` | `test_user_status_transition` |
| Property 5 | `accounts/tests.py` | `test_user_list_has_complete_fields` |
| Property 6 | `facilities/tests.py` | `test_facility_status_matches_bookings` |
| Property 7 | `parcels/tests.py` | `test_parcel_registration_creates_notification` |
| Property 8 | `parcels/tests.py` | `test_parcel_list_has_complete_fields_and_ownership` |
| Property 9 | `parcels/tests.py` | `test_parcel_pickup_round_trip` |
| Property 10 | `notifications/tests.py` | `test_publish_creates_notifications_for_all_residents` |
| Property 11 | `social/tests.py` | `test_post_visibility_within_project` |
| Property 12 | `social/tests.py` | `test_like_idempotent` |
| Property 13 | `social/tests.py` | `test_share_link_unique_and_auth_required` |
| Property 14 | `social/tests.py` | `test_alert_posts_pinned_at_top` |
| Property 15 | `social/tests.py` | `test_report_creates_notification_for_juristic` |
| Property 16 | `chatbot/tests.py` | `test_chatbot_history_always_recorded` |
| Property 17 | `parcels/tests.py` | `test_ocr_high_confidence_returns_complete_data` |
| Property 18 | `events/tests.py` | `test_event_and_announcement_have_required_fields` |
| Property 19 | `events/tests.py` | `test_events_announcements_sorted_by_priority_then_date` |
| Property 20 | `analytics/tests.py` | `test_analytics_filtered_by_time_range` |
| Property 21 | `analytics/tests.py` | `test_community_health_has_complete_fields` |
| Property 22 | `*/tests.py` | `test_crud_round_trip` (ทุก app) |

### Unit Tests — ตัวอย่างเฉพาะและ Edge Cases

Unit tests จะเน้นที่:
- ตัวอย่างเฉพาะ: ลงทะเบียนด้วยอีเมลซ้ำ (1.4), login ด้วยบัญชี pending (2.3)
- Edge cases: พัสดุไม่ถูกรับ 7 วัน (6.5), OCR confidence < 60% (9.4), ผู้ใช้ไม่ authenticated เปิด share link (7.6)
- Integration: Supabase Auth flow, OCR → Typhoon pipeline
- Error conditions: API timeout, invalid file upload, Gemini error

### Frontend Testing

- **React Web**: Jest + React Testing Library สำหรับ component tests
- **React Native**: Jest + React Native Testing Library
- เน้นทดสอบ: navigation flow, widget rendering, form validation, error states

### Test Execution

```bash
# Backend tests
cd backend
source venv/bin/activate
python manage.py test

# Frontend Web tests
cd frontend-web
npm test

# Frontend Mobile tests
cd frontend-mobile
npm test
```
