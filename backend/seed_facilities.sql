-- Sansiri-style Facility Seed Data
-- วิธีใช้: เอา project_id จาก table projects มาแทน YOUR_PROJECT_ID แล้วรันใน Supabase SQL Editor
--
-- ดู project_id ก่อน:
--   SELECT id, name FROM projects;
--
-- ⚠️ ต้องเพิ่ม column requires_booking ก่อน (ถ้ายังไม่มี):
--   ALTER TABLE facilities ADD COLUMN IF NOT EXISTS requires_booking BOOLEAN DEFAULT false;

INSERT INTO facilities (id, project_id, name, type, description, operating_hours, requires_booking, is_active, created_at) VALUES
  -- ไม่ต้องจอง
  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Fitness Center', 'fitness',
   'ห้องออกกำลังกายพร้อมอุปกรณ์ครบครัน ลู่วิ่ง จักรยาน เครื่องเวท และ Free Weight Zone',
   '06:00 - 22:00', false, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Swimming Pool', 'pool',
   'สระว่ายน้ำ Lap Pool พร้อม Jacuzzi น้ำร้อน-เย็น และ Kids Pool',
   '06:00 - 21:00', false, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Sauna & Steam Room', 'sauna',
   'ห้องซาวน่าและสตีมรูม แยกชาย-หญิง',
   '06:00 - 21:00', false, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Library', 'library',
   'ห้องสมุดและมุมอ่านหนังสือ บรรยากาศเงียบสงบ',
   '06:00 - 22:00', false, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Garden & Terrace', 'garden',
   'สวนส่วนกลางและลานพักผ่อน พร้อมพื้นที่สีเขียวและม้านั่ง',
   '06:00 - 22:00', false, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Kids Zone', 'kids_zone',
   'พื้นที่เล่นสำหรับเด็ก พร้อมของเล่นและสนามเด็กเล่นในร่ม',
   '08:00 - 20:00', false, true, now()),

  -- ต้องจอง
  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Co-Working Space', 'co_working',
   'พื้นที่ทำงานร่วม พร้อม Wi-Fi ความเร็วสูง ปลั๊กไฟ และเครื่องพิมพ์',
   '06:00 - 23:00', true, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Meeting Room A', 'meeting_room',
   'ห้องประชุมขนาด 8-10 ที่นั่ง พร้อมจอ TV และไวท์บอร์ด',
   '08:00 - 20:00', true, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Meeting Room B', 'meeting_room',
   'ห้องประชุมขนาดเล็ก 4-6 ที่นั่ง เหมาะสำหรับประชุมกลุ่มย่อย',
   '08:00 - 20:00', true, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Theatre Room', 'theatre',
   'ห้องดูหนังส่วนตัว จุ 10-15 คน พร้อมระบบเสียง Surround',
   '10:00 - 22:00', true, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Sky Lounge', 'sky_lounge',
   'Sky Lounge ชั้นดาดฟ้า วิวพาโนรามา เหมาะสำหรับจัดปาร์ตี้เล็กๆ หรือนั่งพักผ่อน',
   '10:00 - 22:00', true, true, now());
