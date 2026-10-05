/**
 * Multi-Factor Relevance Ranking Engine
 * Computes transparent, explainable ranking scores for search results.
 * Combines exact match, prefix match, field weightings, fuzzy penalties, and academic merit boost.
 */

class Ranker {
  /**
   * Scores and ranks a student against a query
   * @param {Object} student
   * @param {string} query
   * @param {Array<string>} queryTokens
   * @returns {{ score: number, breakdown: Array<{ reason: string, points: number }> }}
   */
  static scoreStudent(student, query, queryTokens) {
    let score = 0;
    const breakdown = [];
    const qLower = query.toLowerCase().trim();

    // 1. Exact Roll Number Match (+100)
    if (student.rollNo && student.rollNo.toLowerCase() === qLower) {
      score += 100;
      breakdown.push({ reason: 'Exact Roll Number Match', points: 100 });
    } else if (student.rollNo && student.rollNo.toLowerCase().startsWith(qLower)) {
      score += 50;
      breakdown.push({ reason: 'Roll Number Prefix Match', points: 50 });
    }

    // 2. Exact Name Match (+80) or Name Contains (+40)
    if (student.name && student.name.toLowerCase() === qLower) {
      score += 80;
      breakdown.push({ reason: 'Exact Full Name Match', points: 80 });
    } else if (student.name && student.name.toLowerCase().includes(qLower)) {
      score += 45;
      breakdown.push({ reason: 'Name Contains Keyword', points: 45 });
    }

    // 3. Department Match (+35)
    if (student.department && (student.department.toLowerCase().includes(qLower) || qLower.includes(student.department.toLowerCase()))) {
      score += 35;
      breakdown.push({ reason: 'Department Match', points: 35 });
    }

    // 4. Skills Match (+30 per matched skill)
    if (Array.isArray(student.skills)) {
      let matchedSkillCount = 0;
      for (const skill of student.skills) {
        const sLower = skill.toLowerCase();
        if (sLower === qLower || queryTokens.some(t => sLower.includes(t))) {
          matchedSkillCount++;
        }
      }
      if (matchedSkillCount > 0) {
        const pts = Math.min(60, matchedSkillCount * 25);
        score += pts;
        breakdown.push({ reason: `Matched ${matchedSkillCount} Technical Skill(s)`, points: pts });
      }
    }

    // 5. Projects Match (+20 per matched project)
    if (Array.isArray(student.projects)) {
      let projHits = 0;
      for (const p of student.projects) {
        const pText = `${p.title} ${p.description || ''} ${(p.techStack || []).join(' ')}`.toLowerCase();
        if (pText.includes(qLower) || queryTokens.some(t => pText.includes(t))) {
          projHits++;
        }
      }
      if (projHits > 0) {
        const pts = Math.min(40, projHits * 20);
        score += pts;
        breakdown.push({ reason: `Matched ${projHits} Project Keyword(s)`, points: pts });
      }
    }

    // 6. Token Overlap from Inverted Index
    let tokenMatches = 0;
    for (const token of queryTokens) {
      const fullProfile = `${student.name} ${student.rollNo} ${student.department} ${(student.skills || []).join(' ')}`.toLowerCase();
      if (fullProfile.includes(token)) {
        tokenMatches++;
      }
    }
    if (tokenMatches > 0) {
      const tokenPts = tokenMatches * 10;
      score += tokenPts;
      breakdown.push({ reason: `Matched ${tokenMatches} Search Term(s)`, points: tokenPts });
    }

    // 7. Academic Merit Boost (Tie-breaker: CGPA up to +10, Attendance up to +10)
    if (score > 0) {
      if (student.cgpa) {
        const cgpaBoost = parseFloat((student.cgpa * 1.0).toFixed(1)); // e.g. 9.4 -> 9.4 pts
        score += cgpaBoost;
        breakdown.push({ reason: `CGPA Merit Boost (${student.cgpa})`, points: cgpaBoost });
      }
      if (student.attendance) {
        const attBoost = parseFloat((student.attendance * 0.08).toFixed(1)); // e.g. 90% -> 7.2 pts
        score += attBoost;
        breakdown.push({ reason: `Attendance Reliability Boost (${student.attendance}%)`, points: attBoost });
      }
    }

    // Normalize to a clean scale (0 - 100 max visually capped at 100%)
    const normalizedScore = Math.min(100, parseFloat(score.toFixed(1)));

    return {
      score: normalizedScore,
      rawScore: score,
      breakdown
    };
  }

  /**
   * Sorts candidate student records using the relevance ranker
   * @param {Array<Object>} students
   * @param {string} query
   */
  static rank(students, query) {
    const startTime = process.hrtime.bigint();
    if (!query || query.trim() === '') {
      return {
        rankedResults: students.map(s => ({ student: s, score: 100, breakdown: [] })),
        executionTimeMs: 0
      };
    }

    const qLower = query.toLowerCase().trim();
    const queryTokens = qLower.split(/\s+/).filter(t => t.length > 1);

    const scored = [];

    for (const student of students) {
      const { score, breakdown } = this.scoreStudent(student, query, queryTokens);
      if (score > 0) {
        scored.push({
          student,
          score,
          breakdown
        });
      }
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Secondary sort: CGPA descending
      return (b.student.cgpa || 0) - (a.student.cgpa || 0);
    });

    const endTime = process.hrtime.bigint();
    const executionTimeMs = Number(endTime - startTime) / 1e6;

    return {
      rankedResults: scored,
      totalRanked: scored.length,
      executionTimeMs: parseFloat(executionTimeMs.toFixed(3))
    };
  }
}

module.exports = Ranker;
