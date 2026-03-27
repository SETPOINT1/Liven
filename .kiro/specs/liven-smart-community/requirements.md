# เอกสารข้อกำหนดความต้องการ (Requirements Document)

## บทนำ

Liven เป็นแพลตฟอร์มชุมชนอัจฉริยะ (Smart Community Platform) ที่พัฒนาขึ้นสำหรับ Sansiri Hackathon ภายใต้แนวคิด "Better Living → Better Community" โดยใช้เทคโนโลยี Cloud และ AI เพื่อแก้ปัญหา 3 มิติ ได้แก่ ความไม่สะดวกของลูกบ้านในการเข้าถึงสิ่งอำนวยความสะดวกส่วนกลาง ภาระงานเอกสารและงานซ้ำซ้อนของนิติบุคคล และช่องว่างข้อมูลหลังการขาย (Post-Sale Data Gap) ของผู้พัฒนาโครงการ ระบบประกอบด้วยแอปพลิเคชันสำหรับลูกบ้าน (React Native) และแดชบอร์ดสำหรับนิติบุคคลและผู้พัฒนา (React Web) โดยใช้ Django เป็น Backend, PostgreSQL + Supabase เป็นฐานข้อมูล และ Deploy บน AWS EC2

## อภิธานศัพท์ (Glossary)

- **Liven_System**: ระบบแพลตฟอร์มชุมชนอัจฉริยะทั้งหมด รวมถึงแอปพลิเคชันมือถือ เว็บแดชบอร์ด และ Backend API
- **Resident_App**: แอปพลิเคชันมือถือ (React Native) สำหรับลูกบ้าน
- **Dashboard**: เว็บแดชบอร์ด (React) สำหรับนิติบุคคลและผู้พัฒนาโครงการ
- **Resident (ลูกบ้าน)**: ผู้อยู่อาศัยในโครงการคอนโดมิเนียมหรือหมู่บ้านจัดสรร
- **Juristic_Person (นิติบุคคล)**: เจ้าหน้าที่นิติบุคคลที่ดูแลจัดการโครงการที่อยู่อาศัย
- **Developer (ผู้พัฒนาโครงการ)**: ทีมงานของ Sansiri ที่ต้องการข้อมูลเชิงลึกหลังการขาย
- **Widget**: ส่วนประกอบ UI แบบ modular บนหน้าหลักของแอปที่แสดงข้อมูลสรุปและคำแนะนำ
- **Facility (สิ่งอำนวยความสะดวก)**: พื้นที่ส่วนกลางของโครงการ เช่น ฟิตเนส ที่จอดรถ ห้องประชุม สระว่ายน้ำ
- **Parcel (พัสดุ)**: สิ่งของที่จัดส่งมาถึงโครงการสำหรับลูกบ้าน
- **OCR_Engine**: ระบบอ่านข้อความจากภาพถ่ายพัสดุ โดยใช้ Azure Computer Vision (free student credits) ร่วมกับ Typhoon
- **Chatbot**: ระบบตอบคำถามอัตโนมัติ 24/7 โดยใช้ Gemini free model
- **Social_Feed**: พื้นที่โซเชียลฟีดภายในชุมชนสำหรับโพสต์ กดไลก์ คอมเมนต์ และแชร์
- **Community_Health**: ชุดข้อมูลวิเคราะห์สุขภาพชุมชน ประกอบด้วย engagement level, สถิติการใช้สิ่งอำนวยความสะดวก และแนวโน้มปัญหาจาก chatbot

## ข้อกำหนดความต้องการ (Requirements)

---

### ข้อกำหนดที่ 1: การลงทะเบียนและขอสิทธิ์เข้าใช้งาน

**User Story:** ในฐานะลูกบ้าน ฉันต้องการลงทะเบียนและขอสิทธิ์เข้าใช้งานระบบ เพื่อให้สามารถเข้าถึงบริการต่าง ๆ ของโครงการได้

#### เกณฑ์การยอมรับ (Acceptance Criteria)

1. WHEN Resident ส่งแบบฟอร์มลงทะเบียนพร้อมข้อมูลชื่อ อีเมล เบอร์โทรศัพท์ และหมายเลขห้อง/บ้าน, THE Liven_System SHALL บันทึกข้อมูลการลงทะเบียนและตั้งสถานะเป็น "รอการอนุมัติ"
2. WHEN Resident ลงทะเบียนสำเร็จ, THE Liven_System SHALL ส่งการแจ้งเตือนไปยัง Juristic_Person เพื่อตรวจสอบและอนุมัติ
3. IF Resident ส่งแบบฟอร์มลงทะเบียนที่มีข้อมูลไม่ครบถ้วนหรือรูปแบบไม่ถูกต้อง, THEN THE Liven_System SHALL แสดงข้อความแจ้งข้อผิดพลาดที่ระบุฟิลด์ที่ต้องแก้ไข
4. IF Resident ลงทะเบียนด้วยอีเมลที่มีอยู่ในระบบแล้ว, THEN THE Liven_System SHALL แสดงข้อความแจ้งว่าอีเมลนี้ถูกใช้งานแล้ว

---

### ข้อกำหนดที่ 2: การเข้าสู่ระบบ

**User Story:** ในฐานะผู้ใช้งาน (ลูกบ้านหรือนิติบุคคล) ฉันต้องการเข้าสู่ระบบด้วยข้อมูลประจำตัว เพื่อเข้าถึงฟีเจอร์ที่เกี่ยวข้องกับบทบาทของฉัน

#### เกณฑ์การยอมรับ (Acceptance Criteria)

1. WHEN ผู้ใช้งานกรอกอีเมลและรหัสผ่านที่ถูกต้อง, THE Liven_System SHALL ตรวจสอบข้อมูลประจำตัวและนำผู้ใช้งานไปยังหน้าหลักตามบทบาท (Resident_App สำหรับลูกบ้าน, Dashboard สำหรับนิติบุคคล)
2. IF ผู้ใช้งานกรอกข้อมูลประจำตัวไม่ถูกต้อง, THEN THE Liven_System SHALL แสดงข้อความแจ้งว่าอีเมลหรือรหัสผ่านไม่ถูกต้อง
3. IF ผู้ใช้งานพยายามเข้าสู่ระบบด้วยบัญชีที่มีสถานะ "รอการอนุมัติ", THEN THE Liven_System SHALL แสดงข้อความแจ้งว่าบัญชียังไม่ได้รับการอนุมัติ
4. THE Liven_System SHALL ใช้ Supabase Authentication สำหรับจัดการ session และ JWT token

---

### ข้อกำหนดที่ 3: การจัดการสิทธิ์ผู้ใช้งาน

**User Story:** ในฐานะนิติบุคคล ฉันต้องการจัดการสิทธิ์ผู้ใช้งาน เพื่อควบคุมการเข้าถึงระบบและอนุมัติลูกบ้านใหม่

#### เกณฑ์การยอมรับ (Acceptance Criteria)

1. WHEN Juristic_Person เลือกอนุมัติคำขอลงทะเบียนของ Resident, THE Dashboard SHALL เปลี่ยนสถานะบัญชีเป็น "อนุมัติแล้ว" และส่งการแจ้งเตือนไปยัง Resident
2. WHEN Juristic_Person เลือกปฏิเสธคำขอลงทะเบียน, THE Dashboard SHALL เปลี่ยนสถานะบัญชีเป็น "ถูกปฏิเสธ" พร้อมบันทึกเหตุผล
3. THE Dashboard SHALL แสดงรายการผู้ใช้งานทั้งหมดพร้อมสถานะ บทบาท และข้อมูลห้อง/บ้าน
4. WHEN Juristic_Person เปลี่ยนบทบาทหรือระงับบัญชีผู้ใช้งาน, THE Liven_System SHALL อัปเดตสิทธิ์การเข้าถึงทันที

---

### ข้อกำหนดที่ 4: หน้าหลักแบบ Widget และคำแนะนำ

**User Story:** ในฐานะลูกบ้าน ฉันต้องการเห็นข้อมูลสรุปและคำแนะนำบนหน้าหลัก เพื่อเข้าถึงข้อมูลสำคัญได้อย่างรวดเร็ว

#### เกณฑ์การยอมรับ (Acceptance Criteria)

1. THE Resident_App SHALL แสดงหน้าหลักแบบ Widget ที่ประกอบด้วย สถานะสิ่งอำนวยความสะดวก สถานะพัสดุ ข่าวสารล่าสุด และ Social_Feed
2. THE Resident_App SHALL แสดงคำแนะนำที่ปรับตามพฤติกรรมการใช้งานของ Resident แต่ละคน (เช่น สิ่งอำนวยความสะดวกที่ใช้บ่อย กิจกรรมที่สนใจ)
3. WHEN Resident แตะที่ Widget ใด ๆ, THE Resident_App SHALL นำทางไปยังหน้ารายละเอียดของฟีเจอร์นั้น

---

### ข้อกำหนดที่ 5: สถานะสิ่งอำนวยความสะดวกแบบ Real-time

**User Story:** ในฐานะลูกบ้าน ฉันต้องการดูสถานะการใช้งานสิ่งอำนวยความสะดวกส่วนกลางแบบ real-time เพื่อวางแผนการใช้งานล่วงหน้า

#### เกณฑ์การยอมรับ (Acceptance Criteria)

1. THE Resident_App SHALL แสดงสถานะปัจจุบันของ Facility แต่ละแห่ง (ฟิตเนส ที่จอดรถ พื้นที่ส่วนกลาง) โดยแสดงสถานะ "ว่าง" หรือ "ไม่ว่าง" ตามข้อมูลการจอง
2. WHEN Facility มีการจองในช่วงเวลาปัจจุบัน, THE Resident_App SHALL แสดงสถานะ "ไม่ว่าง" บน Widget สถานะของ Facility นั้น
3. WHEN Facility ไม่มีการจองในช่วงเวลาปัจจุบัน, THE Resident_App SHALL แสดงสถานะ "ว่าง" บน Widget สถานะของ Facility นั้น
4. THE Liven_System SHALL อัปเดตสถานะ Facility แบบ real-time ผ่าน Supabase Realtime subscriptions

---

### ข้อกำหนดที่ 6: Smart Notification และการติดตามพัสดุ

**User Story:** ในฐานะลูกบ้าน ฉันต้องการได้รับการแจ้งเตือนอัจฉริยะและติดตามสถานะพัสดุ เพื่อไม่พลาดข่าวสารสำคัญและรับพัสดุได้ทันเวลา

#### เกณฑ์การยอมรับ (Acceptance Criteria)

1. WHEN พัสดุของ Resident มาถึงโครงการและถูกบันทึกในระบบ, THE Liven_System SHALL ส่ง push notification ไปยัง Resident_App ของเจ้าของพัสดุ
2. THE Resident_App SHALL แสดงรายการพัสดุทั้งหมดของ Resident พร้อมสถานะ (รอรับ, รับแล้ว) วันที่มาถึง และรูปภาพพัสดุ
3. WHEN Resident มารับพัสดุและ Juristic_Person ยืนยันการรับ, THE Liven_System SHALL อัปเดตสถานะพัสดุเป็น "รับแล้ว" พร้อมบันทึกวันเวลาที่รับ
4. WHEN มีข่าวสารหรือประกาศใหม่จาก Juristic_Person, THE Liven_System SHALL ส่ง push notification ไปยัง Resident_App ของลูกบ้านทุกคนในโครงการ
5. IF พัสดุไม่ถูกรับภายใน 7 วัน, THEN THE Liven_System SHALL ส่งการแจ้งเตือนซ้ำไปยัง Resident

---

### ข้อกำหนดที่ 7: Social Feed ชุมชน

**User Story:** ในฐานะลูกบ้าน ฉันต้องการมีพื้นที่โซเชียลฟีดภายในชุมชน เพื่อแลกเปลี่ยนข้อมูลและสร้างปฏิสัมพันธ์กับเพื่อนบ้าน

#### เกณฑ์การยอมรับ (Acceptance Criteria)

1. THE Resident_App SHALL อนุญาตให้ Resident สร้างโพสต์ใน Social_Feed พร้อมข้อความและรูปภาพ
2. WHEN Resident สร้างโพสต์ใหม่, THE Liven_System SHALL บันทึกโพสต์และแสดงใน Social_Feed ของลูกบ้านทุกคนในโครงการเดียวกัน
3. THE Resident_App SHALL อนุญาตให้ Resident กดไลก์และคอมเมนต์โพสต์ใน Social_Feed
4. WHEN Resident เลือกแชร์โพสต์, THE Resident_App SHALL สร้างลิงก์เฉพาะของโพสต์นั้นและเปิดเมนูแชร์ของระบบปฏิบัติการ เพื่อให้ Resident สามารถส่งลิงก์ผ่านแอปภายนอก (เช่น LINE, Facebook, SMS)
5. WHEN ผู้รับลิงก์เปิดลิงก์โพสต์, THE Liven_System SHALL ตรวจสอบว่าผู้เปิดลิงก์มีบัญชีและเข้าสู่ระบบใน Resident_App แล้ว จึงแสดงเนื้อหาโพสต์
6. IF ผู้เปิดลิงก์โพสต์ไม่มีบัญชีหรือยังไม่ได้เข้าสู่ระบบใน Resident_App, THEN THE Liven_System SHALL แสดงหน้าแจ้งให้ดาวน์โหลดแอปหรือเข้าสู่ระบบก่อนเข้าถึงเนื้อหา
7. THE Dashboard SHALL อนุญาตให้ Juristic_Person สร้างโพสต์ประเภท "ประกาศ" และ "แจ้งเตือน" ใน Social_Feed
8. WHEN Juristic_Person สร้างโพสต์ประเภท "แจ้งเตือน", THE Liven_System SHALL แสดงโพสต์นั้นแบบปักหมุดที่ด้านบนของ Social_Feed
9. IF Resident รายงานโพสต์ที่ไม่เหมาะสม, THEN THE Liven_System SHALL ส่งการแจ้งเตือนไปยัง Juristic_Person เพื่อตรวจสอบ

---

### ข้อกำหนดที่ 8: Smart Chatbot

**User Story:** ในฐานะลูกบ้าน ฉันต้องการถามคำถามเกี่ยวกับโครงการผ่าน chatbot ตลอด 24 ชั่วโมง เพื่อได้รับคำตอบทันทีโดยไม่ต้องรอเจ้าหน้าที่

#### เกณฑ์การยอมรับ (Acceptance Criteria)

1. THE Resident_App SHALL มีหน้า Chatbot ที่ Resident สามารถพิมพ์คำถามเป็นภาษาไทยหรือภาษาอังกฤษ
2. WHEN Resident ส่งคำถาม, THE Chatbot SHALL ประมวลผลคำถามผ่าน Gemini free model และตอบกลับภายใน 10 วินาที
3. THE Chatbot SHALL ตอบคำถามเกี่ยวกับข้อมูลโครงการ กฎระเบียบ สิ่งอำนวยความสะดวก และบริการต่าง ๆ โดยอ้างอิงจากฐานความรู้ที่ Juristic_Person กำหนด
4. IF Chatbot ไม่สามารถตอบคำถามได้, THEN THE Chatbot SHALL แจ้ง Resident ว่าจะส่งต่อคำถามไปยัง Juristic_Person และบันทึกคำถามนั้นในระบบ
5. THE Liven_System SHALL บันทึกประวัติการสนทนาทั้งหมดเพื่อใช้วิเคราะห์แนวโน้มปัญหาใน Community_Health

---

### ข้อกำหนดที่ 9: การจัดการพัสดุด้วย AI (OCR)

**User Story:** ในฐานะนิติบุคคล ฉันต้องการระบบจัดการพัสดุอัตโนมัติด้วย OCR เพื่อลดภาระงานบันทึกข้อมูลพัสดุด้วยมือ

#### เกณฑ์การยอมรับ (Acceptance Criteria)

1. WHEN Juristic_Person ถ่ายภาพใบปะหน้าพัสดุผ่าน Dashboard, THE OCR_Engine SHALL อ่านข้อมูลจากภาพ (ชื่อผู้รับ หมายเลขห้อง/บ้าน บริษัทขนส่ง หมายเลขพัสดุ) โดยใช้ Azure Computer Vision
2. WHEN OCR_Engine อ่านข้อมูลจากภาพสำเร็จ, THE Liven_System SHALL แสดงข้อมูลที่อ่านได้ในแบบฟอร์มให้ Juristic_Person ตรวจสอบและแก้ไขก่อนบันทึก
3. WHEN Juristic_Person ยืนยันข้อมูลพัสดุ, THE Liven_System SHALL บันทึกข้อมูลพัสดุในฐานข้อมูลและส่งการแจ้งเตือนไปยัง Resident เจ้าของพัสดุ
4. IF OCR_Engine ไม่สามารถอ่านข้อมูลจากภาพได้ (ความมั่นใจต่ำกว่า 60%), THEN THE Liven_System SHALL แสดงแบบฟอร์มว่างให้ Juristic_Person กรอกข้อมูลด้วยตนเอง
5. THE Liven_System SHALL ใช้ Typhoon model เพื่อช่วยจัดรูปแบบและแก้ไขข้อมูลภาษาไทยที่ OCR_Engine อ่านได้

---

### ข้อกำหนดที่ 10: การจัดการกิจกรรมและประกาศ

**User Story:** ในฐานะนิติบุคคล ฉันต้องการสร้างและจัดการกิจกรรมและประกาศ เพื่อสื่อสารข้อมูลสำคัญไปยังลูกบ้านอย่างมีประสิทธิภาพ

#### เกณฑ์การยอมรับ (Acceptance Criteria)

1. THE Dashboard SHALL อนุญาตให้ Juristic_Person สร้างกิจกรรม (Event) พร้อมข้อมูล ชื่อกิจกรรม รายละเอียด วันเวลา สถานที่ และรูปภาพ
2. THE Dashboard SHALL อนุญาตให้ Juristic_Person สร้างประกาศ (Announcement) พร้อมข้อมูล หัวข้อ เนื้อหา ระดับความสำคัญ (ปกติ สำคัญ ฉุกเฉิน) และวันหมดอายุ
3. WHEN Juristic_Person เผยแพร่กิจกรรมหรือประกาศ, THE Liven_System SHALL ส่ง push notification ไปยัง Resident ทุกคนในโครงการ
4. THE Resident_App SHALL แสดงรายการกิจกรรมและประกาศ โดยเรียงลำดับตามวันที่และระดับความสำคัญ
5. WHEN ประกาศมีระดับความสำคัญ "ฉุกเฉิน", THE Resident_App SHALL แสดงป๊อปอัปแจ้งเตือนทันทีเมื่อ Resident เปิดแอป

---

### ข้อกำหนดที่ 11: Community Overview Dashboard

**User Story:** ในฐานะนิติบุคคลและผู้พัฒนาโครงการ ฉันต้องการดูแดชบอร์ดภาพรวมชุมชน เพื่อวิเคราะห์ข้อมูลและตัดสินใจบนพื้นฐานข้อมูลจริง

#### เกณฑ์การยอมรับ (Acceptance Criteria)

1. THE Dashboard SHALL แสดงข้อมูล Community_Health ประกอบด้วย ระดับ engagement ของลูกบ้าน (จำนวนการเข้าใช้งาน โพสต์ คอมเมนต์) สถิติการใช้ Facility แต่ละแห่ง และแนวโน้มปัญหาจาก Chatbot
2. THE Dashboard SHALL แสดงกราฟสถิติการใช้ Facility แยกตามช่วงเวลา (รายวัน รายสัปดาห์ รายเดือน)
3. THE Dashboard SHALL แสดงสรุปจำนวนพัสดุที่รับเข้า-ส่งออก แยกตามช่วงเวลา
4. THE Dashboard SHALL แสดง Top 10 คำถามที่ถูกถามบ่อยที่สุดผ่าน Chatbot พร้อมจำนวนครั้ง
5. WHEN Developer เลือกช่วงเวลาที่ต้องการดูข้อมูล, THE Dashboard SHALL กรองและแสดงข้อมูลตามช่วงเวลาที่เลือก
6. THE Dashboard SHALL แสดงอัตราความพึงพอใจของลูกบ้าน (คำนวณจาก engagement level และจำนวนปัญหาที่รายงาน)

---

### ข้อกำหนดที่ 12: โครงสร้างฐานข้อมูลและ API

**User Story:** ในฐานะนักพัฒนา ฉันต้องการโครงสร้างฐานข้อมูลและ API ที่ชัดเจน เพื่อพัฒนาระบบได้อย่างมีประสิทธิภาพ

#### เกณฑ์การยอมรับ (Acceptance Criteria)

1. THE Liven_System SHALL ใช้ PostgreSQL ผ่าน Supabase เป็นฐานข้อมูลหลัก พร้อมตารางสำหรับ Users, Projects, Facilities, Parcels, Posts, Comments, Events, Announcements, ChatHistory และ Notifications
2. THE Liven_System SHALL มี Django REST API ที่รองรับ CRUD operations สำหรับทุกตาราง พร้อมระบบ authentication ผ่าน Supabase JWT
3. THE Liven_System SHALL ใช้ Supabase Realtime สำหรับอัปเดตสถานะ Facility และการแจ้งเตือนแบบ real-time
4. THE Liven_System SHALL จัดเก็บรูปภาพ (พัสดุ โพสต์ กิจกรรม) ใน Supabase Storage

---

### ข้อกำหนดที่ 13: การ Deploy และโครงสร้างโปรเจกต์

**User Story:** ในฐานะนักพัฒนา ฉันต้องการโครงสร้างโปรเจกต์ที่เป็นมาตรฐานและแผนการ deploy ที่ชัดเจน เพื่อพัฒนาและส่งมอบระบบได้อย่างราบรื่น

#### เกณฑ์การยอมรับ (Acceptance Criteria)

1. THE Liven_System SHALL มีโครงสร้างโปรเจกต์แยก 3 ส่วน ได้แก่ backend (Django), frontend-web (React), frontend-mobile (React Native)
2. THE Liven_System SHALL ใช้ venv สำหรับ Python virtual environment และ .env สำหรับเก็บ API keys (Supabase, Azure, Gemini)
3. THE Liven_System SHALL deploy บน AWS EC2 โดยใช้ Nginx เป็น reverse proxy สำหรับ Django backend และ React web frontend
4. THE Liven_System SHALL มีไฟล์ .env.example ที่ระบุ environment variables ทั้งหมดที่จำเป็น โดยไม่มีค่าจริง
5. THE Liven_System SHALL มีไฟล์ README.md ที่อธิบายขั้นตอนการติดตั้ง การตั้งค่า Supabase และการ deploy บน AWS EC2
