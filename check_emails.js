import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const schema = new mongoose.Schema({
  email: String,
  name: String
}, { strict: false });

const Teacher = mongoose.model('Teacher', schema);

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const teachers = await Teacher.find({}, 'email name plan planStatus role avatar');
    console.log("ALL TEACHERS IN DB:");
    teachers.forEach(t => {
      console.log(`- Email: "${t.email}" | Name: "${t.name}" | Avatar: ${!!t.avatar}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
