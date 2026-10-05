/**
 * Similarity Matching Engine
 * Implements Jaccard Similarity and Cosine Similarity over student profiles
 * (skills, project keywords, department, and academic achievements).
 * Solves finding similar peers, project teammates, or candidate matching.
 */

class SimilarityEngine {
  /**
   * Calculates Jaccard similarity index between two Sets: |A ∩ B| / |A ∪ B|
   * @param {Set<string>} setA
   * @param {Set<string>} setB
   * @returns {{ score: number, intersection: string[], unionSize: number }}
   */
  static jaccard(setA, setB) {
    if (setA.size === 0 && setB.size === 0) {
      return { score: 1.0, intersection: [], unionSize: 0 };
    }

    const intersection = [];
    for (const item of setA) {
      if (setB.has(item)) {
        intersection.push(item);
      }
    }

    const unionSize = new Set([...setA, ...setB]).size;
    const score = unionSize === 0 ? 0 : intersection.length / unionSize;

    return {
      score: parseFloat(score.toFixed(3)),
      intersection,
      unionSize
    };
  }

  /**
   * Vectorizes a student profile into a normalized word frequency map
   * @param {Object} student
   * @returns {Map<string, number>}
   */
  static extractFeatureVector(student) {
    const vector = new Map();

    const addTokens = (tokens, weight = 1) => {
      for (const t of tokens) {
        const clean = t.toLowerCase().trim();
        if (clean.length > 1) {
          vector.set(clean, (vector.get(clean) || 0) + weight);
        }
      }
    };

    // Department (weight 1.5)
    if (student.department) {
      addTokens(student.department.split(/\s+/), 1.5);
    }

    // Skills (weight 3.0)
    if (Array.isArray(student.skills)) {
      student.skills.forEach(skill => {
        addTokens([skill], 3.0);
        addTokens(skill.split(/\s+/), 1.5);
      });
    }

    // Projects (weight 2.0)
    if (Array.isArray(student.projects)) {
      student.projects.forEach(p => {
        if (p.techStack && Array.isArray(p.techStack)) {
          addTokens(p.techStack, 2.5);
        }
        if (p.title) {
          addTokens(p.title.split(/\s+/), 1.5);
        }
      });
    }

    // Achievements (weight 1.0)
    if (Array.isArray(student.achievements)) {
      student.achievements.forEach(ach => {
        addTokens(ach.split(/\s+/), 1.0);
      });
    }

    return vector;
  }

  /**
   * Computes Cosine Similarity between two term-frequency vectors
   * @param {Map<string, number>} vecA
   * @param {Map<string, number>} vecB
   * @returns {number}
   */
  static cosine(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (const [term, valA] of vecA.entries()) {
      normA += valA * valA;
      if (vecB.has(term)) {
        dotProduct += valA * vecB.get(term);
      }
    }

    for (const [, valB] of vecB.entries()) {
      normB += valB * valB;
    }

    if (normA === 0 || normB === 0) return 0;
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return parseFloat(similarity.toFixed(3));
  }

  /**
   * Find most similar students to a target student
   * @param {string|Object} targetStudent
   * @param {Array<Object>} allStudents
   * @param {number} topK
   */
  static findSimilar(targetStudent, allStudents, topK = 5) {
    const startTime = process.hrtime.bigint();
    const target = typeof targetStudent === 'string'
      ? allStudents.find(s => s.id === targetStudent || s.rollNo.toLowerCase() === targetStudent.toLowerCase())
      : targetStudent;

    if (!target) {
      return { target: null, similarStudents: [], executionTimeMs: 0 };
    }

    const targetVector = this.extractFeatureVector(target);
    const targetSkillSet = new Set((target.skills || []).map(s => s.toLowerCase().trim()));

    const candidates = [];

    for (const student of allStudents) {
      if (student.id === target.id) continue;

      const candVector = this.extractFeatureVector(student);
      const candSkillSet = new Set((student.skills || []).map(s => s.toLowerCase().trim()));

      const jaccardRes = this.jaccard(targetSkillSet, candSkillSet);
      const cosineRes = this.cosine(targetVector, candVector);

      // Composite similarity: 60% Cosine (broader profile) + 40% Jaccard (exact skill overlap)
      const combinedScore = parseFloat((cosineRes * 0.6 + jaccardRes.score * 0.4).toFixed(3));

      // Calculate shared skills
      const sharedSkills = (student.skills || []).filter(s =>
        targetSkillSet.has(s.toLowerCase().trim())
      );

      candidates.push({
        student,
        similarityScore: combinedScore,
        cosineScore: cosineRes,
        jaccardScore: jaccardRes.score,
        sharedSkills,
        sameDepartment: student.department === target.department,
        cgpaDifference: Math.abs((student.cgpa || 0) - (target.cgpa || 0)).toFixed(2)
      });
    }

    candidates.sort((a, b) => b.similarityScore - a.similarityScore);

    const endTime = process.hrtime.bigint();
    const executionTimeMs = Number(endTime - startTime) / 1e6;

    return {
      targetStudent: target,
      similarStudents: candidates.slice(0, topK),
      totalCompared: candidates.length,
      executionTimeMs: parseFloat(executionTimeMs.toFixed(3))
    };
  }
}

module.exports = SimilarityEngine;
