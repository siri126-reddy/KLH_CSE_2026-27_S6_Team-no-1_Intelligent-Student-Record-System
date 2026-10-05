/**
 * Fuzzy Search using Levenshtein Distance Algorithm (Dynamic Programming)
 * Measures edit distance (insertions, deletions, substitutions) between query and target tokens.
 * Solves spelling mistakes and typo-tolerant search in student records.
 */

class FuzzySearch {
  /**
   * Computes Levenshtein edit distance and 2D DP matrix
   * @param {string} str1 Source word (e.g. user input / query)
   * @param {string} str2 Target word (e.g. record token)
   * @returns {{ distance: number, similarity: number, matrix: number[][], str1: string, str2: string }}
   */
  static levenshtein(str1, str2) {
    const s1 = (str1 || '').toLowerCase().trim();
    const s2 = (str2 || '').toLowerCase().trim();

    const m = s1.length;
    const n = s2.length;

    // DP table: (m + 1) x (n + 1)
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // Deletion
          dp[i][j - 1] + 1,      // Insertion
          dp[i - 1][j - 1] + cost // Substitution
        );
      }
    }

    const distance = dp[m][n];
    const maxLen = Math.max(m, n);
    const similarity = maxLen === 0 ? 1 : Math.max(0, 1 - distance / maxLen);

    return {
      distance,
      similarity: parseFloat(similarity.toFixed(3)),
      matrix: dp,
      str1: s1,
      str2: s2
    };
  }

  /**
   * Search student records with fuzzy tolerance
   * @param {Array<Object>} students
   * @param {string} query
   * @param {number} maxDistanceThreshold Max edit distance to consider a match (default 2)
   */
  static searchStudents(students, query, maxDistanceThreshold = 2) {
    const startTime = process.hrtime.bigint();
    if (!query || query.trim().length === 0) {
      return { results: [], executionTimeMs: 0, queryMatrix: null };
    }

    const cleanQuery = query.trim().toLowerCase();
    const queryTokens = cleanQuery.split(/\s+/).filter(t => t.length > 0);
    const results = [];
    let bestMatrixSample = null;
    let minGlobalDistance = Infinity;

    for (const student of students) {
      // Gather target words from student attributes
      const candidateTokens = [];

      // Name tokens and full name
      candidateTokens.push({ text: student.name, field: 'name' });
      student.name.split(/\s+/).forEach(w => candidateTokens.push({ text: w, field: 'name (part)' }));

      // Roll Number
      candidateTokens.push({ text: student.rollNo, field: 'rollNo' });

      // Department
      candidateTokens.push({ text: student.department, field: 'department' });

      // Skills
      if (Array.isArray(student.skills)) {
        student.skills.forEach(s => {
          candidateTokens.push({ text: s, field: 'skill' });
          s.split(/\s+/).forEach(part => candidateTokens.push({ text: part, field: 'skill (part)' }));
        });
      }

      // Projects
      if (Array.isArray(student.projects)) {
        student.projects.forEach(p => {
          candidateTokens.push({ text: p.title, field: 'project' });
          p.title.split(/\s+/).forEach(part => candidateTokens.push({ text: part, field: 'project (part)' }));
        });
      }

      let bestStudentMatch = null;

      for (const qTok of queryTokens) {
        for (const candidate of candidateTokens) {
          const candText = candidate.text.toLowerCase();
          // Skip if candidate is vastly different in length
          if (Math.abs(candText.length - qTok.length) > maxDistanceThreshold) continue;

          const res = this.levenshtein(qTok, candText);

          if (res.distance <= maxDistanceThreshold) {
            if (!bestStudentMatch || res.distance < bestStudentMatch.distance) {
              bestStudentMatch = {
                distance: res.distance,
                similarity: res.similarity,
                matchedToken: candidate.text,
                queryToken: qTok,
                field: candidate.field,
                matrix: res.matrix
              };

              if (res.distance < minGlobalDistance && qTok.length <= 10 && candText.length <= 10) {
                minGlobalDistance = res.distance;
                bestMatrixSample = {
                  str1: qTok,
                  str2: candText,
                  distance: res.distance,
                  matrix: res.matrix,
                  matchedField: candidate.field
                };
              }
            }
          }
        }
      }

      if (bestStudentMatch) {
        results.push({
          student,
          fuzzyScore: bestStudentMatch.similarity,
          editDistance: bestStudentMatch.distance,
          matchedTerm: bestStudentMatch.matchedToken,
          queryTerm: bestStudentMatch.queryToken,
          field: bestStudentMatch.field
        });
      }
    }

    // Sort by smallest distance first, then highest similarity
    results.sort((a, b) => {
      if (a.editDistance !== b.editDistance) {
        return a.editDistance - b.editDistance;
      }
      return b.fuzzyScore - a.fuzzyScore;
    });

    const endTime = process.hrtime.bigint();
    const executionTimeMs = Number(endTime - startTime) / 1e6;

    return {
      results,
      query: cleanQuery,
      threshold: maxDistanceThreshold,
      totalMatches: results.length,
      bestMatrixSample,
      executionTimeMs: parseFloat(executionTimeMs.toFixed(3))
    };
  }
}

module.exports = FuzzySearch;
