# Implementation Plan: Liven Smart Community Platform

## Overview

แผนการ implement แพลตฟอร์มชุมชนอัจฉริยะ Liven ประกอบด้วย Backend (Django REST Framework), Frontend Web (React + Vite), Frontend Mobile (React Native) โดยใช้ Supabase เป็น BaaS และ deploy บน AWS EC2 พร้อม Nginx reverse proxy แต่ละ task สร้างขึ้นแบบ incremental เพื่อให้ระบบทำงานได้ตั้งแต่ขั้นตอนแรก

## Tasks

- [x] 1. ตั้งค่าโครงสร้างโปรเจกต์และ Environment
  - [x] 1.1 สร้างโครงสร้างโฟลเดอร์หลักและไฟล์ configuration
    - สร้างโฟลเดอร์ `backend/`, `frontend-web/`, `frontend-mobile/`, `nginx/`
    - สร้างไฟล์ `.gitignore`, `README.md`
    - สร้างไฟล์ `.env.example` สำหรับทั้ง backend และ frontend ตามที่ระบุใน design
    - _Requirements: 13.1, 13.2, 13.4_

  - [x] 1.2 ตั้งค่า Django Project และ Apps
    - สร้าง Django project `liven` ใน `backend/`
    - สร้าง Django apps ทั้ง 8 ตัว: `accounts`, `facilities`, `parcels`, `social`, `events`, `chatbot`, `analytics`, `notifications`
    - ตั้งค่า `settings.py` (INSTALLED_APPS, REST_FRAMEWORK, CORS, database config ผ่าน DATABASE_URL)
    - สร้าง `requirements.txt` พร้อม dependencies ทั้งหมด (django, djangorestframework, supabase, google-generativeai, azure-cognitiveservices-vision-computervision, requests, gunicorn, pillow, django-cors-headers, python-dotenv, hypothesis)
    - _Requirements: 12.2, 13.1, 13.2_

  - [x] 1.3 ตั้งค่า React Web Dashboard (Vite)
    - สร้างโปรเจกต์ React ด้วย Vite ใน `frontend-web/`
    - ติดตั้ง dependencies: `@supabase/supabase-js`, `axios`, `react-router-dom`, `recharts`, `@headlessui/react`
    - สร้างไฟล์ `src/services/supabase.js` และ `src/services/api.js` (Supabase client + Axios instance)
    - สร้าง `.env.example` สำหรับ frontend
    - _Requirements: 13.1_

  - [x] 1.4 ตั้งค่า React Native Mobile App
    - สร้างโปรเจกต์ React Native ใน `frontend-mobile/`
    - ติดตั้ง dependencies: `@supabase/supabase-js`, `axios`, `@react-navigation/native`, `@react-navigation/bottom-tabs`, `react-native-push-notification`
    - สร้างไฟล์ `src/services/supabase.js` และ `src/services/api.js`
    - สร้าง `.env.example` สำหรับ mobile
    - _Requirements: 13.1_

- [x] 2. ตั้งค่าฐานข้อมูล Supabase
  - [x] 2.1 สร้าง SQL Migration สำหรับ Supabase
    - สร้างไฟล์ `backend/supabase_migration.sql` ที่มี SQL ทั้งหมดตาม design (CREATE TABLE, indexes, RLS policies, storage buckets)
    - ครอบคลุมตาราง: projects, users, facilities, bookings, parcels, posts, comments, likes, post_reports, events, announcements, chat_history, knowledge_base, notifications
    - รวม constraints ทั้งหมด (CHECK, UNIQUE, FOREIGN KEY, valid_time_range)
    - _Requirements: 12.1_

  - [x] 2.2 สร้าง Django Models สำหรับทุก App
    - เขียน models ใน `accounts/models.py`: User, Project
    - เขียน models ใน `facilities/models.py`: Facility, Booking
    - เขียน models ใน `parcels/models.py`: Parcel
    - เขียน models ใน `social/models.py`: Post, Comment, Like, PostReport
    - เขียน models ใน `events/models.py`: Event, Announcement
    - เขียน models ใน `chatbot/models.py`: ChatHistory, KnowledgeBase
    - เขียน models ใน `notifications/models.py`: Notification
    - ใช้ `managed = False` เนื่องจากตารางอยู่ใน Supabase แล้ว
    - _Requirements: 12.1, 12.2_

- [x] 3. Checkpoint — ตรวจสอบโครงสร้างโปรเจกต์
  - ตรวจสอบว่า Django project รันได้ (`python manage.py check`)
  - ตรวจสอบว่า React Web build ได้ (`npm run build`)
  - ตรวจสอบว่า React Native รันได้
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Backend — accounts App (การลงทะเบียน, Login, จัดการผู้ใช้)
  - [x] 4.1 สร้าง Serializers และ Views สำหรับ accounts
    - เขียน `accounts/serializers.py`: RegisterSerializer, UserSerializer, UserApprovalSerializer
    - เขียน `accounts/views.py`: RegisterView (POST /api/auth/register/), MeView (GET /api/auth/me/), UserListView (GET /api/users/), ApproveUserView (PATCH /api/users/{id}/approve/), RejectUserView (PATCH /api/users/{id}/reject/), ChangeRoleView (PATCH /api/users/{id}/role/)
    - เขียน `accounts/urls.py` พร้อม URL patterns
    - implement Supabase JWT verification middleware
    - implement role-based permission classes (IsJuristic, IsApproved)
    - สร้าง notification เมื่อลงทะเบียนสำเร็จ (แจ้งนิติบุคคล) และเมื่ออนุมัติ/ปฏิเสธ (แจ้ง resident)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

  - [x] 4.2 เขียน Property Test — Property 1: การลงทะเบียนสร้างผู้ใช้สถานะ pending พร้อมแจ้งเตือน
    - **Property 1: การลงทะเบียนสร้างผู้ใช้สถานะ pending พร้อมแจ้งเตือน**
    - ใช้ Hypothesis สร้างข้อมูลลงทะเบียนที่ถูกต้อง ตรวจสอบว่าสถานะเป็น pending และมี notification สำหรับนิติบุคคล
    - **Validates: Requirements 1.1, 1.2**

  - [x] 4.3 เขียน Property Test — Property 2: การ validate ข้อมูลลงทะเบียนที่ไม่ถูกต้อง
    - **Property 2: การ validate ข้อมูลลงทะเบียนที่ไม่ถูกต้อง**
    - ใช้ Hypothesis สร้างข้อมูลที่ไม่ถูกต้อง (อีเมลผิดรูปแบบ, ฟิลด์ว่าง) ตรวจสอบว่าระบบปฏิเสธและจำนวนผู้ใช้ไม่เปลี่ยน
    - **Validates: Requirements 1.3**

  - [x] 4.4 เขียน Property Test — Property 3: การ login ส่งกลับบทบาทที่ถูกต้อง
    - **Property 3: การ login ส่งกลับบทบาทที่ถูกต้อง**
    - ใช้ Hypothesis สร้างผู้ใช้ที่มีสถานะ approved ตรวจสอบว่า login ส่งกลับ role ที่ตรงกับฐานข้อมูล
    - **Validates: Requirements 2.1**

  - [x] 4.5 เขียน Property Test — Property 4: การเปลี่ยนสถานะผู้ใช้
    - **Property 4: การเปลี่ยนสถานะผู้ใช้ (อนุมัติ/ปฏิเสธ/ระงับ)**
    - ใช้ Hypothesis ทดสอบ state transitions ของผู้ใช้ ตรวจสอบว่าสถานะเปลี่ยนถูกต้องและมี notification
    - **Validates: Requirements 3.1, 3.2, 3.4**

  - [x] 4.6 เขียน Property Test — Property 5: รายการผู้ใช้มีข้อมูลครบถ้วน
    - **Property 5: รายการผู้ใช้มีข้อมูลครบถ้วน**
    - ใช้ Hypothesis ตรวจสอบว่าทุก record มีฟิลด์ status, role, unit_number
    - **Validates: Requirements 3.3**

- [x] 5. Backend — facilities App (สิ่งอำนวยความสะดวกและการจอง)
  - [x] 5.1 สร้าง Serializers และ Views สำหรับ facilities
    - เขียน `facilities/serializers.py`: FacilitySerializer, BookingSerializer, FacilityStatusSerializer
    - เขียน `facilities/views.py`: FacilityListView (GET /api/facilities/), FacilityStatusView (GET /api/facilities/{id}/status/), BookFacilityView (POST /api/facilities/{id}/book/), BookingListView (GET /api/bookings/)
    - เขียน `facilities/urls.py`
    - implement logic สำหรับคำนวณสถานะ facility (ว่าง/ไม่ว่าง) จากข้อมูล booking ที่ทับซ้อนกับเวลาปัจจุบัน
    - implement validation สำหรับ booking (ตรวจสอบ time range, ไม่ให้จองซ้อน)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 12.2, 12.3_

  - [x] 5.2 เขียน Property Test — Property 6: สถานะ Facility ตรงกับข้อมูลการจอง
    - **Property 6: สถานะ Facility ตรงกับข้อมูลการจอง**
    - ใช้ Hypothesis สร้าง facility และ bookings ตรวจสอบว่าสถานะตรงกับ booking overlap
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 6. Backend — parcels App (พัสดุและ OCR)
  - [x] 6.1 สร้าง Serializers และ Views สำหรับ parcels
    - เขียน `parcels/serializers.py`: ParcelSerializer, ParcelCreateSerializer, OCRResultSerializer
    - เขียน `parcels/views.py`: ParcelListView (GET /api/parcels/), ParcelCreateView (POST /api/parcels/), OCRScanView (POST /api/parcels/ocr/), ParcelPickupView (PATCH /api/parcels/{id}/pickup/)
    - เขียน `parcels/urls.py`
    - implement การสร้าง notification เมื่อบันทึกพัสดุใหม่
    - implement การอัปเดตสถานะ picked_up พร้อมบันทึก picked_up_at
    - implement การอัปโหลดรูปภาพพัสดุไปยัง Supabase Storage
    - _Requirements: 6.1, 6.2, 6.3, 9.3, 12.2, 12.4_

  - [x] 6.2 Implement OCR Pipeline (Azure Computer Vision + Typhoon)
    - สร้าง service module `parcels/ocr_service.py`
    - implement การเรียก Azure Computer Vision API เพื่ออ่านข้อความจากภาพ
    - implement การเรียก Typhoon API เพื่อจัดรูปแบบข้อมูลภาษาไทย
    - implement logic สำหรับ confidence threshold (>= 60% ส่งข้อมูล, < 60% ส่งฟอร์มว่าง)
    - implement error handling: retry 1 ครั้งเมื่อ timeout, fallback เมื่อ Typhoon error
    - _Requirements: 9.1, 9.2, 9.4, 9.5_

  - [x] 6.3 เขียน Property Test — Property 7: การบันทึกพัสดุสร้าง notification ให้เจ้าของ
    - **Property 7: การบันทึกพัสดุสร้าง notification ให้เจ้าของ**
    - ใช้ Hypothesis ตรวจสอบว่าเมื่อบันทึกพัสดุ จะสร้าง notification ประเภท parcel สำหรับ resident
    - **Validates: Requirements 6.1, 9.3**

  - [x] 6.4 เขียน Property Test — Property 8: รายการพัสดุของ Resident มีข้อมูลครบถ้วน
    - **Property 8: รายการพัสดุของ Resident มีข้อมูลครบถ้วน**
    - ใช้ Hypothesis ตรวจสอบว่าทุก record มี status, arrived_at, image_url และเป็นของ resident คนนั้น
    - **Validates: Requirements 6.2**

  - [x] 6.5 เขียน Property Test — Property 9: การยืนยันรับพัสดุ (Pickup Round Trip)
    - **Property 9: การยืนยันรับพัสดุ (Pickup Round Trip)**
    - ใช้ Hypothesis ตรวจสอบว่าเมื่อยืนยันรับ สถานะเปลี่ยนเป็น picked_up และ picked_up_at ไม่เป็น null
    - **Validates: Requirements 6.3**

  - [x] 6.6 เขียน Property Test — Property 17: OCR ที่มี confidence >= 60% ส่งกลับข้อมูลครบ
    - **Property 17: OCR ที่มี confidence >= 60% ส่งกลับข้อมูลครบ**
    - ใช้ Hypothesis ตรวจสอบว่า OCR result ที่มี confidence >= 60% มีฟิลด์ครบ
    - **Validates: Requirements 9.2**

- [x] 7. Backend — social App (Social Feed)
  - [x] 7.1 สร้าง Serializers และ Views สำหรับ social
    - เขียน `social/serializers.py`: PostSerializer, CommentSerializer, LikeSerializer, PostReportSerializer, ShareLinkSerializer
    - เขียน `social/views.py`: PostListView (GET /api/posts/), PostCreateView (POST /api/posts/), LikeView (POST /api/posts/{id}/like/), CommentCreateView (POST /api/posts/{id}/comments/), ReportPostView (POST /api/posts/{id}/report/), ShareLinkView (GET /api/posts/{id}/share-link/)
    - เขียน `social/urls.py`
    - implement feed logic: โพสต์ alert (is_pinned) แสดงก่อน, จากนั้นเรียงตาม created_at DESC
    - implement project-scoped visibility (ผู้ใช้เห็นเฉพาะโพสต์ในโครงการตัวเอง)
    - implement share token generation (unique token สำหรับแต่ละโพสต์)
    - implement like idempotency (unique constraint post_id + user_id, toggle like/unlike)
    - implement report → สร้าง notification ให้นิติบุคคล
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9_

  - [x] 7.2 เขียน Property Test — Property 11: การสร้างโพสต์และการมองเห็นภายในโครงการ
    - **Property 11: การสร้างโพสต์และการมองเห็นภายในโครงการ**
    - ใช้ Hypothesis ตรวจสอบว่าโพสต์ปรากฏเฉพาะใน feed ของโครงการเดียวกัน
    - **Validates: Requirements 7.1, 7.2, 7.7**

  - [x] 7.3 เขียน Property Test — Property 12: Like เป็น idempotent ต่อผู้ใช้
    - **Property 12: Like เป็น idempotent ต่อผู้ใช้**
    - ใช้ Hypothesis ตรวจสอบว่าการกดไลก์ซ้ำไม่เพิ่มจำนวนไลก์
    - **Validates: Requirements 7.3**

  - [x] 7.4 เขียน Property Test — Property 13: Share link เป็น unique และเข้าถึงได้เฉพาะผู้ที่ authenticated
    - **Property 13: Share link เป็น unique และเข้าถึงได้เฉพาะผู้ที่ authenticated**
    - ใช้ Hypothesis ตรวจสอบว่า share token ไม่ซ้ำ และ unauthenticated ถูกปฏิเสธ
    - **Validates: Requirements 7.4, 7.5**

  - [x] 7.5 เขียน Property Test — Property 14: โพสต์ประเภท alert ถูกปักหมุดที่ด้านบน feed
    - **Property 14: โพสต์ประเภท alert ถูกปักหมุดที่ด้านบน feed**
    - ใช้ Hypothesis ตรวจสอบว่าโพสต์ alert ปรากฏก่อนโพสต์ประเภทอื่นเสมอ
    - **Validates: Requirements 7.8**

  - [x] 7.6 เขียน Property Test — Property 15: การรายงานโพสต์สร้าง notification ให้นิติบุคคล
    - **Property 15: การรายงานโพสต์สร้าง notification ให้นิติบุคคล**
    - ใช้ Hypothesis ตรวจสอบว่าเมื่อรายงานโพสต์ จะสร้าง notification ประเภท report สำหรับนิติบุคคล
    - **Validates: Requirements 7.9**

- [x] 8. Checkpoint — ตรวจสอบ Backend Core APIs
  - ตรวจสอบว่า accounts, facilities, parcels, social APIs ทำงานถูกต้อง
  - รัน `python manage.py test accounts facilities parcels social`
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Backend — events App (กิจกรรมและประกาศ)
  - [x] 9.1 สร้าง Serializers และ Views สำหรับ events
    - เขียน `events/serializers.py`: EventSerializer, AnnouncementSerializer
    - เขียน `events/views.py`: EventListCreateView (GET/POST /api/events/), AnnouncementListCreateView (GET/POST /api/announcements/)
    - เขียน `events/urls.py`
    - implement permission: เฉพาะ juristic สร้างได้
    - implement การเรียงลำดับ: priority (emergency > important > normal) แล้วตาม created_at DESC
    - implement การสร้าง notification ให้ทุก approved resident เมื่อเผยแพร่
    - implement การอัปโหลดรูปภาพกิจกรรมไปยัง Supabase Storage
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 9.2 เขียน Property Test — Property 10: การเผยแพร่ประกาศ/กิจกรรมสร้าง notification ให้ทุกคน
    - **Property 10: การเผยแพร่ประกาศ/กิจกรรมสร้าง notification ให้ทุกคนในโครงการ**
    - ใช้ Hypothesis ตรวจสอบว่าจำนวน notification เท่ากับจำนวน approved residents
    - **Validates: Requirements 6.4, 10.3**

  - [x] 9.3 เขียน Property Test — Property 18: กิจกรรมและประกาศมีข้อมูลครบถ้วน
    - **Property 18: กิจกรรมและประกาศมีข้อมูลครบถ้วนตามที่กำหนด**
    - ใช้ Hypothesis ตรวจสอบว่า event มี title, description, event_date, location และ announcement มี title, content, priority
    - **Validates: Requirements 10.1, 10.2**

  - [x] 9.4 เขียน Property Test — Property 19: การเรียงลำดับกิจกรรมและประกาศ
    - **Property 19: การเรียงลำดับกิจกรรมและประกาศ**
    - ใช้ Hypothesis ตรวจสอบว่าลำดับเรียงตาม priority ก่อน แล้วตามวันที่
    - **Validates: Requirements 10.4**

- [x] 10. Backend — chatbot App (Smart Chatbot)
  - [x] 10.1 สร้าง Serializers, Views และ Gemini Integration สำหรับ chatbot
    - เขียน `chatbot/serializers.py`: ChatMessageSerializer, ChatHistorySerializer
    - เขียน `chatbot/views.py`: SendMessageView (POST /api/chatbot/message/), ChatHistoryView (GET /api/chatbot/history/)
    - สร้าง service module `chatbot/gemini_service.py`
    - implement การเรียก Gemini API พร้อม system prompt ที่รวม knowledge base ของโครงการ
    - implement การบันทึก ChatHistory ทุกครั้ง (user_message + bot_response)
    - implement escalation logic: เมื่อ Gemini ตอบไม่ได้ → ตั้ง is_escalated = true, สร้าง notification ให้นิติบุคคล
    - implement error handling: timeout → ข้อความ "ขออภัย ระบบขัดข้อง", Gemini error → retry 1 ครั้ง
    - เขียน `chatbot/urls.py`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 10.2 เขียน Property Test — Property 16: ประวัติ Chatbot ถูกบันทึกทุกครั้ง
    - **Property 16: ประวัติ Chatbot ถูกบันทึกทุกครั้ง**
    - ใช้ Hypothesis ตรวจสอบว่าทุกข้อความสร้าง ChatHistory ที่มี user_message และ bot_response ไม่ว่าง
    - **Validates: Requirements 8.4, 8.5**

- [x] 11. Backend — analytics App (Community Health Dashboard)
  - [x] 11.1 สร้าง Serializers และ Views สำหรับ analytics
    - เขียน `analytics/serializers.py`: CommunityHealthSerializer, FacilityUsageSerializer, ParcelStatsSerializer, ChatbotTrendsSerializer
    - เขียน `analytics/views.py`: CommunityHealthView (GET /api/analytics/community-health/), FacilityUsageView (GET /api/analytics/facility-usage/), ParcelStatsView (GET /api/analytics/parcel-stats/), ChatbotTrendsView (GET /api/analytics/chatbot-trends/)
    - เขียน `analytics/urls.py`
    - implement query parameters สำหรับกรองตามช่วงเวลา (start_date, end_date)
    - implement engagement level calculation (จำนวนการเข้าใช้งาน, โพสต์, คอมเมนต์)
    - implement satisfaction rate calculation (0-100)
    - implement Top 10 คำถาม chatbot ที่ถูกถามบ่อย
    - implement สถิติพัสดุรับเข้า-ส่งออกแยกตามช่วงเวลา
    - implement สถิติ facility usage แยกตามช่วงเวลา (รายวัน/รายสัปดาห์/รายเดือน)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 11.2 เขียน Property Test — Property 20: ข้อมูล Analytics ถูกกรองตามช่วงเวลา
    - **Property 20: ข้อมูล Analytics ถูกกรองตามช่วงเวลา**
    - ใช้ Hypothesis ตรวจสอบว่าข้อมูลทั้งหมดมี timestamp อยู่ภายในช่วงเวลาที่กำหนด
    - **Validates: Requirements 11.2, 11.3, 11.4, 11.5**

  - [x] 11.3 เขียน Property Test — Property 21: Community Health มีข้อมูลครบถ้วน
    - **Property 21: Community Health มีข้อมูลครบถ้วน**
    - ใช้ Hypothesis ตรวจสอบว่ามีฟิลด์ engagement_level, facility_stats, chatbot_trends และ satisfaction rate อยู่ระหว่าง 0-100
    - **Validates: Requirements 11.1, 11.6**

- [x] 12. Backend — notifications App (การแจ้งเตือน)
  - [x] 12.1 สร้าง Serializers และ Views สำหรับ notifications
    - เขียน `notifications/serializers.py`: NotificationSerializer
    - เขียน `notifications/views.py`: NotificationListView (GET /api/notifications/), MarkAsReadView (PATCH /api/notifications/{id}/read/)
    - เขียน `notifications/urls.py`
    - สร้าง utility function `create_notification(user_id, type, title, body, data)` ที่ใช้ร่วมกันทุก app
    - สร้าง utility function `notify_all_residents(project_id, type, title, body, data)` สำหรับแจ้งเตือนทุกคนในโครงการ
    - _Requirements: 6.1, 6.4, 6.5, 12.2_

- [x] 13. Backend — รวม URL patterns และ Error Handling
  - [x] 13.1 Wire ทุก app URLs เข้า liven/urls.py และ implement error handling กลาง
    - เขียน `liven/urls.py` ที่ include URL patterns จากทุก app ภายใต้ `/api/`
    - implement custom exception handler ที่ส่ง error response ในรูปแบบมาตรฐาน (error.code, error.message, error.details)
    - implement Supabase JWT authentication middleware
    - ตั้งค่า CORS headers สำหรับ frontend
    - _Requirements: 12.2_

  - [x] 13.2 เขียน Property Test — Property 22: CRUD round trip สำหรับทุก model
    - **Property 22: CRUD round trip สำหรับทุก model**
    - ใช้ Hypothesis ทดสอบ create → read round trip สำหรับ User, Facility, Parcel, Post, Event, Announcement
    - **Validates: Requirements 12.2**

- [x] 14. Checkpoint — ตรวจสอบ Backend ทั้งหมด
  - รัน `python manage.py test` ทุก app
  - ตรวจสอบว่าทุก API endpoint ทำงานถูกต้อง
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Frontend Web — Layout, Routing และ Authentication
  - [x] 15.1 สร้าง App Layout, Routing และ Login Page
    - เขียน `src/App.jsx` พร้อม React Router (routes สำหรับ Login, Dashboard, Users, Parcels, Events, SocialFeed, Analytics)
    - สร้าง `src/components/Layout.jsx` (sidebar navigation + header)
    - สร้าง `src/components/ProtectedRoute.jsx` (ตรวจสอบ Supabase session)
    - สร้าง `src/pages/LoginPage.jsx` (login form ด้วย Supabase Auth, redirect ตาม role)
    - สร้าง `src/hooks/useAuth.js` (Supabase auth state management)
    - ตั้งค่า Supabase client ใน `src/services/supabase.js`
    - ตั้งค่า Axios instance ใน `src/services/api.js` (base URL, JWT interceptor)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 13.1_

- [x] 16. Frontend Web — หน้าจัดการผู้ใช้
  - [x] 16.1 สร้าง UsersPage
    - สร้าง `src/pages/UsersPage.jsx` แสดงรายการผู้ใช้ทั้งหมด (ตาราง: ชื่อ, อีเมล, ห้อง, สถานะ, บทบาท)
    - implement ปุ่มอนุมัติ/ปฏิเสธสำหรับผู้ใช้ที่มีสถานะ pending
    - implement ปุ่มเปลี่ยนบทบาทและระงับบัญชี
    - implement Supabase Realtime subscription สำหรับอัปเดตรายการผู้ใช้แบบ real-time
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 17. Frontend Web — หน้าจัดการพัสดุ (OCR)
  - [x] 17.1 สร้าง ParcelsPage พร้อม OCR Scan
    - สร้าง `src/pages/ParcelsPage.jsx` แสดงรายการพัสดุ (ตาราง: ชื่อผู้รับ, ห้อง, ขนส่ง, สถานะ, วันที่)
    - implement ปุ่ม "สแกนพัสดุ" → เปิด modal ถ่ายภาพ/อัปโหลดภาพ → เรียก OCR API
    - implement แสดงผล OCR ในฟอร์มให้แก้ไขก่อนบันทึก
    - implement ปุ่มยืนยันรับพัสดุ (pickup)
    - implement กรณี OCR confidence < 60% → แสดงฟอร์มว่าง
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 6.3_

- [x] 18. Frontend Web — หน้ากิจกรรมและประกาศ
  - [x] 18.1 สร้าง EventsPage
    - สร้าง `src/pages/EventsPage.jsx` แสดงรายการกิจกรรมและประกาศ
    - implement ฟอร์มสร้างกิจกรรม (ชื่อ, รายละเอียด, วันเวลา, สถานที่, รูปภาพ)
    - implement ฟอร์มสร้างประกาศ (หัวข้อ, เนื้อหา, ระดับความสำคัญ, วันหมดอายุ)
    - implement การอัปโหลดรูปภาพไปยัง Supabase Storage
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 19. Frontend Web — หน้า Social Feed Management
  - [x] 19.1 สร้าง SocialFeedPage
    - สร้าง `src/pages/SocialFeedPage.jsx` แสดง feed ของโครงการ
    - implement ฟอร์มสร้างโพสต์ประเภท "ประกาศ" และ "แจ้งเตือน" (juristic only)
    - implement แสดงรายการโพสต์ที่ถูกรายงาน พร้อมปุ่ม reviewed/dismissed
    - _Requirements: 7.7, 7.8, 7.9_

- [x] 20. Frontend Web — หน้า Analytics Dashboard
  - [x] 20.1 สร้าง DashboardPage และ AnalyticsPage
    - สร้าง `src/pages/DashboardPage.jsx` แสดง Community Health Overview (engagement level, facility stats, chatbot trends, satisfaction rate)
    - สร้าง `src/pages/AnalyticsPage.jsx` แสดงกราฟสถิติเชิงลึก
    - implement กราฟ facility usage แยกตามช่วงเวลา (ใช้ Recharts)
    - implement กราฟพัสดุรับเข้า-ส่งออก
    - implement Top 10 คำถาม chatbot
    - implement date range picker สำหรับกรองข้อมูล
    - implement แสดงอัตราความพึงพอใจ
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [x] 21. Checkpoint — ตรวจสอบ Frontend Web Dashboard
  - ตรวจสอบว่า `npm run build` สำเร็จ
  - ตรวจสอบว่าทุกหน้าแสดงผลถูกต้อง
  - Ensure all tests pass, ask the user if questions arise.

- [x] 22. Frontend Mobile — Navigation, Auth และ Home Screen
  - [x] 22.1 สร้าง Navigation Structure และ Login Screen
    - เขียน `src/navigation/AppNavigator.jsx` (Bottom Tab Navigator: Home, Facility, Parcel, Social, Chatbot)
    - สร้าง `src/screens/LoginScreen.jsx` (login/register form ด้วย Supabase Auth)
    - implement auth flow: ตรวจสอบ session → redirect ไป Home หรือ Login
    - implement แสดงข้อความเมื่อบัญชีรอการอนุมัติ
    - ตั้งค่า Supabase client ใน `src/services/supabase.js`
    - ตั้งค่า Axios instance ใน `src/services/api.js`
    - _Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 2.4_

  - [x] 22.2 สร้าง Home Screen แบบ Widget
    - สร้าง `src/screens/HomeScreen.jsx` แสดง Widget layout
    - สร้าง `src/components/widgets/FacilityWidget.jsx` (สถานะสิ่งอำนวยความสะดวก)
    - สร้าง `src/components/widgets/ParcelWidget.jsx` (สถานะพัสดุ)
    - สร้าง `src/components/widgets/NewsWidget.jsx` (ข่าวสารล่าสุด)
    - สร้าง `src/components/widgets/FeedWidget.jsx` (Social Feed preview)
    - implement navigation เมื่อแตะ Widget → ไปหน้ารายละเอียด
    - implement คำแนะนำตามพฤติกรรมการใช้งาน (สิ่งอำนวยความสะดวกที่ใช้บ่อย)
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 23. Frontend Mobile — Facility Screen
  - [x] 23.1 สร้าง FacilityScreen
    - สร้าง `src/screens/FacilityScreen.jsx` แสดงรายการ facility พร้อมสถานะ (ว่าง/ไม่ว่าง)
    - implement Supabase Realtime subscription สำหรับอัปเดตสถานะ facility แบบ real-time
    - implement ฟอร์มจอง facility (เลือกวันเวลา)
    - implement แสดงรายการ booking ของผู้ใช้
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 24. Frontend Mobile — Parcel Screen
  - [x] 24.1 สร้าง ParcelScreen
    - สร้าง `src/screens/ParcelScreen.jsx` แสดงรายการพัสดุของผู้ใช้
    - implement แสดงสถานะ (รอรับ/รับแล้ว), วันที่มาถึง, รูปภาพพัสดุ
    - implement Supabase Realtime subscription สำหรับแจ้งเตือนพัสดุใหม่
    - _Requirements: 6.1, 6.2_

- [x] 25. Frontend Mobile — Social Feed Screen
  - [x] 25.1 สร้าง SocialFeedScreen
    - สร้าง `src/screens/SocialFeedScreen.jsx` แสดง Social Feed
    - implement สร้างโพสต์ (ข้อความ + รูปภาพ) → อัปโหลดรูปไป Supabase Storage
    - implement กดไลก์, คอมเมนต์
    - implement แชร์โพสต์ (สร้าง share link → เปิด OS share menu)
    - implement รายงานโพสต์ไม่เหมาะสม
    - implement แสดงโพสต์ alert แบบปักหมุดด้านบน
    - implement Supabase Realtime subscription สำหรับโพสต์ใหม่
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8, 7.9_

- [x] 26. Frontend Mobile — Chatbot Screen
  - [x] 26.1 สร้าง ChatbotScreen
    - สร้าง `src/screens/ChatbotScreen.jsx` แสดง chat interface
    - implement ส่งข้อความ → เรียก chatbot API → แสดงคำตอบ
    - implement แสดง loading indicator ระหว่างรอคำตอบ
    - implement แสดงประวัติการสนทนา
    - implement แสดงข้อความเมื่อ chatbot ส่งต่อนิติบุคคล (is_escalated)
    - implement error handling: แสดงข้อความ "ขออภัย ระบบขัดข้อง" เมื่อ API error
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 27. Frontend Mobile — Events Screen และ Notifications
  - [x] 27.1 สร้าง EventsScreen และระบบ Notification
    - สร้าง `src/screens/EventsScreen.jsx` แสดงรายการกิจกรรมและประกาศ
    - implement เรียงลำดับตามความสำคัญและวันที่
    - implement แสดงป๊อปอัปเมื่อมีประกาศฉุกเฉิน
    - implement push notification ด้วย react-native-push-notification
    - implement Supabase Realtime subscription สำหรับ notification ใหม่
    - implement in-app notification list
    - _Requirements: 10.4, 10.5, 6.1, 6.4_

- [x] 28. Checkpoint — ตรวจสอบ Frontend Mobile App
  - ตรวจสอบว่าทุกหน้าจอแสดงผลถูกต้อง
  - ตรวจสอบว่า navigation ทำงานถูกต้อง
  - ตรวจสอบว่า Supabase Realtime subscriptions ทำงาน
  - Ensure all tests pass, ask the user if questions arise.

- [x] 29. Deployment — AWS EC2 + Nginx
  - [x] 29.1 สร้างไฟล์ Nginx Configuration และ Systemd Service
    - สร้าง `nginx/liven.conf` ตาม design (reverse proxy สำหรับ Django API + static files สำหรับ React Web)
    - สร้าง `backend/gunicorn.conf.py` (workers, bind address)
    - สร้างไฟล์ `deploy/liven.service` (systemd service สำหรับ Gunicorn)
    - อัปเดต `backend/liven/settings.py` สำหรับ production (DEBUG=False, ALLOWED_HOSTS, STATIC_ROOT, collectstatic)
    - _Requirements: 13.3_

  - [x] 29.2 สร้าง README.md พร้อมขั้นตอนการติดตั้งและ deploy
    - เขียน `README.md` ที่อธิบาย: ภาพรวมโปรเจกต์, ขั้นตอนการติดตั้ง local development, การตั้งค่า Supabase (สร้างโปรเจกต์, รัน SQL migration, เปิด Realtime, สร้าง Storage buckets), การ deploy บน AWS EC2 (ติดตั้ง dependencies, setup backend, build frontend, setup Nginx)
    - _Requirements: 13.3, 13.5_

- [x] 30. Final Checkpoint — ตรวจสอบระบบทั้งหมด
  - รัน backend tests ทั้งหมด: `python manage.py test`
  - รัน frontend web build: `npm run build`
  - ตรวจสอบว่า Nginx config ถูกต้อง
  - ตรวจสอบว่าทุก API endpoint เชื่อมต่อกับ frontend ถูกต้อง
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks ที่มีเครื่องหมาย `*` เป็น optional สามารถข้ามได้เพื่อ MVP ที่เร็วขึ้น
- ทุก task อ้างอิง requirements เฉพาะเพื่อ traceability
- Checkpoints ช่วยตรวจสอบความถูกต้องแบบ incremental
- Property tests ใช้ Hypothesis library สำหรับ Python/Django
- Unit tests ทดสอบตัวอย่างเฉพาะและ edge cases
- Frontend ใช้ Supabase Realtime subscriptions สำหรับ real-time updates
- ทุก AI integration (Gemini, Azure CV, Typhoon) มี error handling และ fallback
