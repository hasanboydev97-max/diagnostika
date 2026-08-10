import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

dotenv.config();

const uri = process.env.MONGODB_URI;

const TeacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  subject: { type: String, required: true },
  role: { type: String, enum: ['teacher', 'admin'], default: 'teacher' },
  plan: { type: String, enum: ['free', 'standard', 'premium'], default: 'free' },
  planStatus: { type: String, enum: ['active', 'pending', 'expired'], default: 'active' },
  requestedPlan: { type: String, enum: ['standard', 'premium', null], default: null },
  paymentNote: { type: String, default: '' },
  planExpiresAt: { type: Date, default: null }
}, { timestamps: true });

const Teacher = mongoose.model('Teacher', TeacherSchema);

async function resetDB() {
  if (!uri) {
    console.error('❌ MONGODB_URI topilmadi');
    process.exit(1);
  }

  try {
    console.log('🔄 MongoDB bazasiga ulaninmoqda...');
    await mongoose.connect(uri, { family: 4, serverSelectionTimeoutMS: 10000 });
    console.log('✅ Ulandi!');

    console.log('🧹 Barcha ma\'lumotlar tozalanmoqda (Teachers, Tests, Results)...');
    
    const collections = await mongoose.connection.db.collections();
    for (let collection of collections) {
      await collection.deleteMany({});
      console.log(`  - ${collection.collectionName} tozalandi`);
    }

    console.log('👑 Yangi SuperAdmin akkaunti yaratilmoqda...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = new Teacher({
      name: 'Super Admin',
      email: 'admin@maktab.uz',
      password: hashedPassword,
      subject: 'Informatika',
      role: 'admin',
      plan: 'premium',
      planStatus: 'active'
    });

    await adminUser.save();
    console.log('🎉 Baza muvaffaqiyatli tozalandi va SuperAdmin akkaunti yaratildi!');
    console.log('   Email: admin@maktab.uz');
    console.log('   Parol: admin123');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

resetDB();
