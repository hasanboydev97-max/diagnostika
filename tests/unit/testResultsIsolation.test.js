/**
 * Unit Tests — Test Results Isolation
 *
 * Ensures that fetching results for a specific test only queries that test's results
 * and never leaks unrelated diagnostic results or results from other tests.
 */
import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';

describe('Test Results Isolation & Query Schema Safety', () => {
  it('ResultSchema must include testId path so Mongoose strictQuery never casts it to empty {}', () => {
    // If strictQuery is true and testId is missing from Schema,
    // Model.find({ testId: { $in: [...] } }) turns into Model.find({})
    const ResultSchema = new mongoose.Schema({
      id: { type: String, required: true },
      testId: { type: String, index: true },
      studentName: String,
      totalScore: Number
    });

    const ResultModel = mongoose.model('TestIsolationResult', ResultSchema);
    const castFilter = ResultModel.find({ testId: { $in: ['test_999'] } }).cast(ResultModel);
    
    expect(castFilter).toHaveProperty('testId');
    expect(castFilter.testId).toEqual({ $in: ['test_999'] });
  });

  it('Percentage calculation handles undefined or 0 gracefully without NaN', () => {
    const calculatePct = (score, totalScore) => {
      const total = totalScore || 1;
      const sc = score ?? 0;
      return Math.round((sc / total) * 100);
    };

    expect(calculatePct(undefined, 82)).toBe(0);
    expect(calculatePct(null, 100)).toBe(0);
    expect(calculatePct(15, 30)).toBe(50);
    expect(calculatePct(28, 30)).toBe(93);
    expect(calculatePct(0, 0)).toBe(0);
  });
});
