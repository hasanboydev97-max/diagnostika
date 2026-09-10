import mongoose from 'mongoose';
import { Teacher, OnlineTest, OnlineTestResult, Result } from '../models/index.js';

export const getSubscriptions = async (req, res) => {
  try {
    const teachers = await Teacher.find().select('-password').sort({ updatedAt: -1 });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateSubscriptionPlan = async (req, res) => {
  try {
    const { teacherId, plan, status, durationDays } = req.body;
    if (!teacherId || !['free', 'standard', 'premium'].includes(plan)) {
      return res.status(400).json({ error: 'Ma\'lumotlar to\'liq emas' });
    }

    let planExpiresAt = null;
    if (plan !== 'free') {
      const days = parseInt(durationDays, 10) || 30;
      const now = new Date();
      now.setDate(now.getDate() + days);
      planExpiresAt = now;
    }

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      {
        plan,
        planStatus: status || 'active',
        requestedPlan: null,
        planExpiresAt
      },
      { new: true }
    ).select('-password');

    res.json({ success: true, teacher: updatedTeacher });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getStats = async (req, res) => {
  try {
    const totalTeachers = await Teacher.countDocuments();
    const totalOnlineTests = await OnlineTest.countDocuments();
    const totalOnlineResults = await OnlineTestResult.countDocuments();
    const totalOfflineResults = await Result.countDocuments();
    
    res.json({
      teachers: totalTeachers,
      tests: totalOnlineTests,
      results: totalOnlineResults + totalOfflineResults
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find().select('-password').sort({ _id: -1 });
    
    // ✅ 8. N+1 Query tuzatish — bitta aggregate so'rov bilan barcha teacher testlarini hisoblaymiz
    // Ilgari: 100 ta teacher = 101 ta DB so'rov. Endi: 1 ta aggregate so'rov.
    const testCountsRaw = await OnlineTest.aggregate([
      { $group: { _id: '$teacherId', count: { $sum: 1 } } }
    ]);
    const testCountMap = Object.fromEntries(
      testCountsRaw.map(({ _id, count }) => [String(_id), count])
    );

    const teachersWithStats = teachers.map(t => ({
      ...t.toObject(),
      testCount: testCountMap[String(t._id)] || 0
    }));
    
    res.json(teachersWithStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    
    const teacher = await Teacher.findById(id);
    if (!teacher) {
      return res.status(404).json({ error: 'O\'qituvchi topilmadi' });
    }
    
    if (teacher.role === 'admin') {
      return res.status(403).json({ error: 'Admin huquqiga ega foydalanuvchini o\'chirish mumkin emas' });
    }

    // Delete associated data (Optional but good practice)
    await OnlineTest.deleteMany({ teacherId: id });
    
    await Teacher.findByIdAndDelete(id);
    res.json({ success: true, message: 'O\'qituvchi muvaffaqiyatli o\'chirildi' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTests = async (req, res) => {
  try {
    // 1.1 FIX: N+1 query tuzatildi — barcha teacherlarni bitta so'rovda olamiz
    const tests = await OnlineTest.find().sort({ createdAt: -1 }).lean();

    // Barcha noyob teacherIdlarni olamiz
    const teacherIds = [...new Set(tests.map(t => t.teacherId).filter(Boolean))];
    const teachers = await Teacher.find({ _id: { $in: teacherIds } })
      .select('name email subject').lean();
    const teacherMap = Object.fromEntries(teachers.map(t => [t._id.toString(), t]));

    const testsWithTeachers = tests.map(test => ({
      ...test,
      teacher: teacherMap[String(test.teacherId)] || null
    }));

    res.json(testsWithTeachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getResults = async (req, res) => {
  try {
    // 1.1 FIX: N+1 query tuzatildi — batch fetch bilan 3 ta so'rov (ilgari 200+)
    const results = await OnlineTestResult.find().sort({ createdAt: -1 }).limit(100).lean();

    // Barcha testIdlarni batch'da olamiz
    const testIds = [...new Set(results.map(r => r.testId).filter(Boolean))];
    const validObjectIds = testIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    const testsRaw = await OnlineTest.find({
      $or: [
        ...(validObjectIds.length ? [{ _id: { $in: validObjectIds } }] : []),
        { id: { $in: testIds } }
      ]
    }).select('title subject teacherId id').lean();

    const testMap = {};
    testsRaw.forEach(t => {
      if (t.id) testMap[t.id] = t;
      testMap[t._id.toString()] = t;
    });

    // Barcha teacherIdlarni batch'da olamiz
    const teacherIds = [...new Set(testsRaw.map(t => t.teacherId).filter(Boolean))];
    const teachersRaw = await Teacher.find({ _id: { $in: teacherIds } })
      .select('name').lean();
    const teacherMap = Object.fromEntries(teachersRaw.map(t => [t._id.toString(), t]));

    const enriched = results.map(r => {
      const test = testMap[r.testId] || null;
      const teacher = test ? teacherMap[String(test.teacherId)] : null;
      return { ...r, test, teacher };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
