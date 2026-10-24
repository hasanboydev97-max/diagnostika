/**
 * Test muhiti sozlash — har test faylidan oldin ishga tushadi.
 */

// ENV o'zgaruvchilarini test uchun o'rnatish
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-32-chars-minimum!!';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/hb-test';
process.env.PORT = '5001';
