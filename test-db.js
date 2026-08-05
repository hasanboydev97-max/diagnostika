import dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config();

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('No MONGODB_URI found');
    return;
  }
  try {
    await mongoose.connect(uri);
    console.log('MongoDB connection successful');
    mongoose.connection.close();
  } catch (e) {
    console.error('MongoDB connection failed:', e.message);
  }
}
run();
