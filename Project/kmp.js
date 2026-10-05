/**
 * Knuth-Morris-Pratt (KMP) Pattern Searching Algorithm
 * Pre-computes Longest Proper Prefix which is also Suffix (LPS) array.
 * Achieves linear time O(N + M) substring pattern matching with zero text backtracking.
 */

class KMP {
  /**
   * Computes the LPS (Longest Prefix Suffix) table for a pattern
   * @param {string} pattern
   * @returns {{ lps: number[], steps: Array<{ i: number, len: number, char: string, lpsVal: number }> }}
   */
  static computeLPS(pattern) {
    const m = pattern.length;
    const lps = new Array(m).fill(0);
    const steps = [];
    let len = 0;
    let i = 1;

    while (i < m) {
      if (pattern[i].toLowerCase() === pattern[len].toLowerCase()) {
        len++;
        lps[i] = len;
        steps.push({ index: i, char: pattern[i], matchedWithLen: len, lpsVal: len, action: 'match' });
        i++;
      } else {
        if (len !== 0) {
          len = lps[len - 1];
          steps.push({ index: i, char: pattern[i], matchedWithLen: len, lpsVal: lps[i], action: 'fallback' });
        } else {
          lps[i] = 0;
          steps.push({ index: i, char: pattern[i], matchedWithLen: 0, lpsVal: 0, action: 'mismatch_zero' });
          i++;
        }
      }
    }

    return { lps, steps };
  }

  /**
   * Searches for occurrences of pattern in text using KMP
   * @param {string} text
   * @param {string} pattern
   * @returns {{ matches: number[], comparisons: number, lps: number[] }}
   */
  static search(text, pattern) {
    if (!text || !pattern || pattern.length === 0) {
      return { matches: [], comparisons: 0, lps: [] };
    }

    const { lps } = this.computeLPS(pattern);
    const n = text.length;
    const m = pattern.length;
    const matches = [];
    let comparisons = 0;

    let i = 0; // index for text
    let j = 0; // index for pattern

    const textLower = text.toLowerCase();
    const patternLower = pattern.toLowerCase();

    while (i < n) {
      comparisons++;
      if (patternLower[j] === textLower[i]) {
        i++;
        j++;
      }

      if (j === m) {
        matches.push(i - j);
        j = lps[j - 1];
      } else if (i < n && patternLower[j] !== textLower[i]) {
        if (j !== 0) {
          j = lps[j - 1];
        } else {
          i++;
        }
      }
    }

    return { matches, comparisons, lps };
  }

  /**
   * Search student database across string fields using KMP
   * @param {Array<Object>} students
   * @param {string} pattern
   * @param {Array<string>} [fields]
   */
  static searchStudents(students, pattern, fields = ['name', 'rollNo', 'department', 'skills', 'projects', 'achievements']) {
    const startTime = process.hrtime.bigint();
    if (!pattern || pattern.trim() === '') {
      return {
        results: [],
        totalComparisons: 0,
        executionTimeMs: 0,
        lps: []
      };
    }

    const cleanPattern = pattern.trim();
    const { lps, steps } = this.computeLPS(cleanPattern);
    const results = [];
    let totalComparisons = 0;

    for (const student of students) {
      const matchDetails = [];

      for (const field of fields) {
        let fieldTexts = [];

        if (field === 'skills' && Array.isArray(student.skills)) {
          fieldTexts = student.skills.map((s, idx) => ({ text: s, subfield: `skill[${idx}]` }));
        } else if (field === 'projects' && Array.isArray(student.projects)) {
          fieldTexts = student.projects.map((p, idx) => ({
            text: `${p.title} - ${p.description || ''} - ${(p.techStack || []).join(' ')}`,
            subfield: `project: ${p.title}`
          }));
        } else if (field === 'achievements' && Array.isArray(student.achievements)) {
          fieldTexts = student.achievements.map((a, idx) => ({ text: a, subfield: `achievement[${idx}]` }));
        } else if (typeof student[field] === 'string') {
          fieldTexts = [{ text: student[field], subfield: field }];
        }

        for (const item of fieldTexts) {
          const searchRes = this.search(item.text, cleanPattern);
          totalComparisons += searchRes.comparisons;

          if (searchRes.matches.length > 0) {
            matchDetails.push({
              field: item.subfield,
              occurrences: searchRes.matches.length,
              positions: searchRes.matches,
              snippet: this.generateSnippet(item.text, searchRes.matches[0], cleanPattern.length)
            });
          }
        }
      }

      if (matchDetails.length > 0) {
        results.push({
          student,
          matchCount: matchDetails.reduce((sum, m) => sum + m.occurrences, 0),
          matchDetails
        });
      }
    }

    const endTime = process.hrtime.bigint();
    const executionTimeMs = Number(endTime - startTime) / 1e6;

    results.sort((a, b) => b.matchCount - a.matchCount);

    return {
      results,
      pattern: cleanPattern,
      lps,
      lpsSteps: steps.slice(0, 15), // sample for UI visualization
      totalComparisons,
      totalMatches: results.length,
      executionTimeMs: parseFloat(executionTimeMs.toFixed(3))
    };
  }

  static generateSnippet(text, matchIndex, patternLen, contextChars = 25) {
    const start = Math.max(0, matchIndex - contextChars);
    const end = Math.min(text.length, matchIndex + patternLen + contextChars);

    const prefix = start > 0 ? '...' : '';
    const suffix = end < text.length ? '...' : '';

    return {
      before: prefix + text.slice(start, matchIndex),
      matched: text.slice(matchIndex, matchIndex + patternLen),
      after: text.slice(matchIndex + patternLen, end) + suffix
    };
  }
}

module.exports = KMP;
