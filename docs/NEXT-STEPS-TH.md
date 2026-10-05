# ขั้นตอนที่ต้องทำต่อ

V4 RC1 ถูกอัปโหลดเข้า main ผ่าน GitHub แล้ว (application commit c671b93) โดยต่อจาก V3 เดิมและใช้ URL เดิม

1. ตั้งค่า Supabase public URL/key แล้ว และผู้ใช้รัน SQL สำเร็จแล้ว ตรวจพบ table/RPC และ anonymous ถูกปฏิเสธสิทธิ์
2. ต้องทดสอบบัญชีจริง 2 บัญชี: signup, ยืนยันอีเมล, login, password reset, RLS แยกผู้ใช้, sync, migration, deletion
3. ยังปิด cloudEnabled จนกว่าการทดสอบ hosted จะผ่าน
4. ต้องตรวจ Safari/iPhone และ Add to Home Screen ด้วยอุปกรณ์จริง

ผลทดสอบ local: browser 72 checks และ PostgreSQL/RLS 16 checks โดย cloud browser tests ใช้ HTTP จำลอง ไม่ใช่ Supabase project จริง

ห้ามใส่ secret ลง frontend/GitHub และยังไม่ใช่ production-ready cloud launch
