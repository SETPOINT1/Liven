# แผนงาน — ระบบจัดการสิ่งอำนวยความสะดวก (Facility Management)

## Task 1: Backend — เพิ่ม API ยกเลิกการจองโดยลูกบ้าน
- [x] 1.1 สร้าง `ResidentBookingCancelView` ใน `backend/facilities/views.py` — `POST /api/bookings/{id}/cancel/` พร้อม permission `IsAuthenticated, IsApproved` ตรวจสอบว่า booking เป็นของ user, status=confirmed, start_time อยู่ในอนาคต แล้วเปลี่ยน status เป็น cancelled
- [x] 1.2 เพิ่ม URL pattern `path('bookings/<uuid:pk>/cancel/', ResidentBookingCancelView.as_view())` ใน `backend/facilities/urls.py`
- [x] 1.3 เพิ่ม validation ใน `BookingCreateSerializer` ตรวจสอบว่า slot duration ตรงกับ Slot_Duration ของประเภท Facility (meeting_room=60, theatre=120, default=60)

## Task 2: Frontend Mobile — เพิ่มหน้าจอประวัติการจอง
- [x] 2.1 สร้าง `BookingHistoryScreen.jsx` ใน `frontend-mobile/src/screens/` — เรียก `GET /api/bookings/` แสดงรายการแบ่ง 2 sections (กำลังจะมาถึง/ผ่านมาแล้ว) พร้อมปุ่มยกเลิกสำหรับ booking ที่ confirmed + อนาคต
- [x] 2.2 เพิ่ม `BookingHistory` screen ใน FacilityStack ของ `frontend-mobile/src/navigation/AppNavigator.jsx` และเพิ่มปุ่มนำทางจาก FacilityScreen
- [x] 2.3 เพิ่ม Supabase Realtime subscription บนตาราง `bookings` ใน `FacilityDetailScreen.jsx` เพื่อ auto-refresh slots เมื่อมีการเปลี่ยนแปลง

## Task 3: Frontend Web — เพิ่มหน้าจัดการ Facility
- [x] 3.1 สร้าง `FacilitiesPage.jsx` ใน `frontend-web/src/pages/` — ตารางแสดงรายการ Facility + Modal ฟอร์มเพิ่ม/แก้ไข + ปุ่มลบพร้อม ConfirmModal ใช้ API `/api/manage/facilities/`
- [x] 3.2 สร้าง `BookingsPage.jsx` ใน `frontend-web/src/pages/` — ตารางแสดงรายการ Booking ทั้งหมด + ปุ่มยกเลิก + Supabase Realtime subscription ใช้ API `/api/manage/bookings/`
- [x] 3.3 เพิ่ม nav items (`🏢 สิ่งอำนวยความสะดวก`, `📋 การจอง`) ใน `Layout.jsx` และเพิ่ม routes `/facilities`, `/bookings` ใน `App.jsx`

## Task 4: Property-Based Tests
- [x] 4.1 เขียน property test: No Booking Overlap Invariant — *For any* Facility และ Booking 2 รายการที่ confirmed ช่วงเวลาต้องไม่ซ้อนทับ (Feature: facility-management, Property 1)
- [x] 4.2 เขียน property test: Slot Boundary Invariant — *For any* Facility ที่มี operating_hours Slot ทั้งหมดต้องอยู่ภายในช่วงเวลาเปิด-ปิด (Feature: facility-management, Property 2)
- [x] 4.3 เขียน property test: Slot Duration Invariant — *For any* Facility ที่ requires_booking=true Slot ต้องมี duration ตรงกับ Slot_Duration (Feature: facility-management, Property 3)
- [x] 4.4 เขียน property test: Advance Booking Limit — *For any* วันที่ที่เกิน 3 วัน หรือผ่านมาแล้ว ต้องถูกปฏิเสธ (Feature: facility-management, Property 4)
- [x] 4.5 เขียน property test: Slot Count Invariant — *For any* Facility จำนวน available + unavailable = total slots (Feature: facility-management, Property 5)
- [x] 4.6 เขียน property test: Resident Booking Cancellation — *For any* Booking ที่ confirmed + อนาคต ยกเลิกได้ ที่ผ่านมาแล้ว/cancelled ยกเลิกไม่ได้ (Feature: facility-management, Property 7)
- [x] 4.7 เขียน property test: Project Isolation — *For any* Juristic ที่จัดการ Facility/Booking ต่างโครงการ ต้องได้ 403 (Feature: facility-management, Property 8)
