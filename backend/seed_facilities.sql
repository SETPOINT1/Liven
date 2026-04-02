-- Sansiri-style Facility Seed Data
-- เธงเธดเธเธตเนเธเน: เน€เธญเธฒ project_id เธเธฒเธ table projects เธกเธฒเนเธ—เธ YOUR_PROJECT_ID เนเธฅเนเธงเธฃเธฑเธเนเธ Supabase SQL Editor
--
-- โ ๏ธ เธ•เนเธญเธเน€เธเธดเนเธก columns เธเนเธญเธ (เธ–เนเธฒเธขเธฑเธเนเธกเนเธกเธต):
--   ALTER TABLE facilities ADD COLUMN IF NOT EXISTS requires_booking BOOLEAN DEFAULT false;
--   ALTER TABLE facilities ADD COLUMN IF NOT EXISTS image_url TEXT;

INSERT INTO facilities (id, project_id, name, type, description, image_url, operating_hours, requires_booking, is_active, created_at) VALUES
  -- เนเธกเนเธ•เนเธญเธเธเธญเธ
  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Fitness Center', 'fitness',
   'เธซเนเธญเธเธญเธญเธเธเธณเธฅเธฑเธเธเธฒเธขเธเธฃเนเธญเธกเธญเธธเธเธเธฃเธ“เนเธเธฃเธเธเธฃเธฑเธ เธฅเธนเนเธงเธดเนเธ เธเธฑเธเธฃเธขเธฒเธ เน€เธเธฃเธทเนเธญเธเน€เธงเธ— เนเธฅเธฐ Free Weight Zone',
   'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
   '06:00 - 22:00', false, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Swimming Pool', 'pool',
   'เธชเธฃเธฐเธงเนเธฒเธขเธเนเธณ Lap Pool เธเธฃเนเธญเธก Jacuzzi เธเนเธณเธฃเนเธญเธ-เน€เธขเนเธ เนเธฅเธฐ Kids Pool',
   'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=800',
   '06:00 - 21:00', false, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Sauna & Steam Room', 'sauna',
   'เธซเนเธญเธเธเธฒเธงเธเนเธฒเนเธฅเธฐเธชเธ•เธตเธกเธฃเธนเธก เนเธขเธเธเธฒเธข-เธซเธเธดเธ',
   'https://images.unsplash.com/photo-1554244933-d876deb6b2ff?w=800',
   '06:00 - 21:00', false, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Library', 'library',
   'เธซเนเธญเธเธชเธกเธธเธ”เนเธฅเธฐเธกเธธเธกเธญเนเธฒเธเธซเธเธฑเธเธชเธทเธญ เธเธฃเธฃเธขเธฒเธเธฒเธจเน€เธเธตเธขเธเธชเธเธ',
   'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800',
   '06:00 - 22:00', false, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Garden & Terrace', 'garden',
   'เธชเธงเธเธชเนเธงเธเธเธฅเธฒเธเนเธฅเธฐเธฅเธฒเธเธเธฑเธเธเนเธญเธ เธเธฃเนเธญเธกเธเธทเนเธเธ—เธตเนเธชเธตเน€เธเธตเธขเธงเนเธฅเธฐเธกเนเธฒเธเธฑเนเธ',
   'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800',
   '06:00 - 22:00', false, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Kids Zone', 'kids_zone',
   'เธเธทเนเธเธ—เธตเนเน€เธฅเนเธเธชเธณเธซเธฃเธฑเธเน€เธ”เนเธ เธเธฃเนเธญเธกเธเธญเธเน€เธฅเนเธเนเธฅเธฐเธชเธเธฒเธกเน€เธ”เนเธเน€เธฅเนเธเนเธเธฃเนเธก',
   'https://images.unsplash.com/photo-1566454419290-57a64afe21af?w=800',
   '08:00 - 20:00', false, true, now()),

  -- เธ•เนเธญเธเธเธญเธ
  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Co-Working Space', 'co_working',
   'เธเธทเนเธเธ—เธตเนเธ—เธณเธเธฒเธเธฃเนเธงเธก เธเธฃเนเธญเธก Wi-Fi เธเธงเธฒเธกเน€เธฃเนเธงเธชเธนเธ เธเธฅเธฑเนเธเนเธ เนเธฅเธฐเน€เธเธฃเธทเนเธญเธเธเธดเธกเธเน',
   'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
   '06:00 - 23:00', true, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Meeting Room A', 'meeting_room',
   'เธซเนเธญเธเธเธฃเธฐเธเธธเธกเธเธเธฒเธ” 8-10 เธ—เธตเนเธเธฑเนเธ เธเธฃเนเธญเธกเธเธญ TV เนเธฅเธฐเนเธงเธ—เนเธเธญเธฃเนเธ”',
   'https://images.unsplash.com/photo-1431540015159-0f9673883ae2?w=800',
   '08:00 - 20:00', true, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Meeting Room B', 'meeting_room',
   'เธซเนเธญเธเธเธฃเธฐเธเธธเธกเธเธเธฒเธ”เน€เธฅเนเธ 4-6 เธ—เธตเนเธเธฑเนเธ เน€เธซเธกเธฒเธฐเธชเธณเธซเธฃเธฑเธเธเธฃเธฐเธเธธเธกเธเธฅเธธเนเธกเธขเนเธญเธข',
   'https://images.unsplash.com/photo-1462826303086-329426d1aef5?w=800',
   '08:00 - 20:00', true, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Theatre Room', 'theatre',
   'เธซเนเธญเธเธ”เธนเธซเธเธฑเธเธชเนเธงเธเธ•เธฑเธง เธเธธ 10-15 เธเธ เธเธฃเนเธญเธกเธฃเธฐเธเธเน€เธชเธตเธขเธ Surround',
   'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
   '10:00 - 22:00', true, true, now()),

  (gen_random_uuid(), 'YOUR_PROJECT_ID', 'Sky Lounge', 'sky_lounge',
   'Sky Lounge เธเธฑเนเธเธ”เธฒเธ”เธเนเธฒ เธงเธดเธงเธเธฒเนเธเธฃเธฒเธกเธฒ เน€เธซเธกเธฒเธฐเธชเธณเธซเธฃเธฑเธเธเธฑเธ”เธเธฒเธฃเนเธ•เธตเนเน€เธฅเนเธเน เธซเธฃเธทเธญเธเธฑเนเธเธเธฑเธเธเนเธญเธ',
   'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800',
   '10:00 - 22:00', true, true, now());
