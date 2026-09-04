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
    // Populate teacher info manually since we don't have refs set up perfectly
    const tests = await OnlineTest.find().sort({ createdAt: -1 }).lean();
    
    const testsWithTeachers = await Promise.all(tests.map(async (test) => {
      let teacher = null;
      if (test.teacherId) {
        teacher = await Teacher.findById(test.teacherId).select('name email subject').lean();
      }
      return { ...test, teacher };
    }));
    
    res.json(testsWithTeachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getResults = async (req, res) => {
  try {
    // Get recent online test results
    const results = await OnlineTestResult.find().sort({ createdAt: -1 }).limit(100).lean();
    
    const resultsWithTestInfo = await Promise.all(results.map(async (res) => {
      let test = null;
      if (res.testId) {
        const testQuery = mongoose.Types.ObjectId.isValid(res.testId)
          ? { $or: [{ _id: res.testId }, { id: res.testId }] }
          : { id: res.testId };
        test = await OnlineTest.findOne(testQuery).select('title subject teacherId').lean();
      }
      let teacher = null;
      if (test && test.teacherId) {
        teacher = await Teacher.findById(test.teacherId).select('name').lean();
      }
      return { ...res, test, teacher };
    }));
    
    res.json(resultsWithTestInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
