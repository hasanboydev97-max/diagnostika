import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const uri = process.env.MONGODB_URI;

async function wipePure() {
  try {
    console.log('🔄 MongoDB bazasiga ulaninmoqda...');
    await mongoose.connect(uri);
    
    const collections = await mongoose.connection.db.collections();
    for (let collection of collections) {
      await collection.deleteMany({});
      console.log(`  - ${collection.collectionName} 100% tozalandi (0 ta hujjat qoldi)`);
    }

    console.log("✅ BAZA BARCHA USERLARDAN 100% TOZALANDI!");
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Xatolar:', err);
    process.exit(1);
  }
}

wipePure();
