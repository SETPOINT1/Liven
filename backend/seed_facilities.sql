-- Sansiri-style Facility Seed Data
-- วิธีใช้: เอา project_id จาก table projects มาแทน YOUR_PROJECT_ID แล้วรันใน Supabase SQL Editor
--
-- ⚠️ ต้องเพิ่ม columns ก่อน (ถ้ายังไม่มี):
--   ALTER TABLE facilities ADD COLUMN IF NOT EXISTS requires_booking BOOLEAN DEFAULT false;
--   ALTER TABLE facilities ADD COLUMN IF NOT EXISTS image_url TEXT;

INSERT INTO facilities (id, project_id, name, type, description, image_url, operating_hours, requires_booking, is_active, created_at) VALUES
  -- ไม่ต้องจอง
  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Fitness Center', 'fitness',
   'ห้องออกกำลังกายพร้อมอุปกรณ์ครบครัน ลู่วิ่ง จักรยาน เครื่องเวท และ Free Weight Zone',
   'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
   '06:00 - 22:00', false, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Swimming Pool', 'pool',
   'สระว่ายน้ำ Lap Pool พร้อม Jacuzzi น้ำร้อน-เย็น และ Kids Pool',
   'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=800',
   '06:00 - 21:00', false, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Sauna & Steam Room', 'sauna',
   'ห้องซาวน่าและสตีมรูม แยกชาย-หญิง',
   'https://images.unsplash.com/photo-1554244933-d876deb6b2ff?w=800',
   '06:00 - 21:00', false, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Library', 'library',
   'ห้องสมุดและมุมอ่านหนังสือ บรรยากาศเงียบสงบ',
   'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800',
   '06:00 - 22:00', false, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Garden & Terrace', 'garden',
   'สวนส่วนกลางและลานพักผ่อน พร้อมพื้นที่สีเขียวและม้านั่ง',
   'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800',
   '06:00 - 22:00', false, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Kids Zone', 'kids_zone',
   'พื้นที่เล่นสำหรับเด็ก พร้อมของเล่นและสนามเด็กเล่นในร่ม',
   'https://images.unsplash.com/photo-1566454419290-57a64afe21af?w=800',
   '08:00 - 20:00', false, true, now()),

  -- ต้องจอง
  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Co-Working Space', 'co_working',
   'พื้นที่ทำงานร่วม พร้อม Wi-Fi ความเร็วสูง ปลั๊กไฟ และเครื่องพิมพ์',
   'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
   '06:00 - 23:00', true, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Meeting Room A', 'meeting_room',
   'ห้องประชุมขนาด 8-10 ที่นั่ง พร้อมจอ TV และไวท์บอร์ด',
   'https://images.unsplash.com/photo-1431540015159-0f9673883ae2?w=800',
   '08:00 - 20:00', true, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Meeting Room B', 'meeting_room',
   'ห้องประชุมขนาดเล็ก 4-6 ที่นั่ง เหมาะสำหรับประชุมกลุ่มย่อย',
   'https://images.unsplash.com/photo-1462826303086-329426d1aef5?w=800',
   '08:00 - 20:00', true, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Theatre Room', 'theatre',
   'ห้องดูหนังส่วนตัว จุ 10-15 คน พร้อมระบบเสียง Surround',
   'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
   '10:00 - 22:00', true, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Sky Lounge', 'sky_lounge',
   'Sky Lounge ชั้นดาดฟ้า วิวพาโนรามา เหมาะสำหรับจัดปาร์ตี้เล็กๆ หรือนั่งพักผ่อน',
   'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800',
   '10:00 - 22:00', true, true, now());
