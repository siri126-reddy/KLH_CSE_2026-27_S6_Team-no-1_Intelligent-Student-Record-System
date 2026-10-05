/**
 * Inverted Index Implementation
 * Maps tokenized terms across student attributes (names, roll numbers, departments, skills, projects, achievements)
 * to posting lists containing student IDs, term frequencies, and matched fields.
 * Enables O(1) term lookup vs O(N) linear database scan.
 */

class InvertedIndex {
  constructor() {
    this.index = new Map(); // token -> Map<studentId, { count: number, fields: Set<string> }>
    this.stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'were', 'will', 'with', 'using', 'based', 'system'
    ]);
    this.totalIndexedTerms = 0;
  }

  tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    return text
      .toLowerCase()
      .replace(/[^a-z0-9+#.-]/g, ' ')
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length > 1 && !this.stopWords.has(w));
  }

  indexStudent(student) {
    if (!student || !student.id) return;
    const studentId = student.id;

    const fieldsToIndex = [
      { name: 'name', value: student.name },
      { name: 'rollNo', value: student.rollNo },
      { name: 'department', value: student.department },
      { name: 'skills', value: Array.isArray(student.skills) ? student.skills.join(' ') : '' },
      { name: 'certifications', value: Array.isArray(student.certifications) ? student.certifications.map(c => `${c.name || ''} ${c.issuer || ''} ${c.credentialId || ''}`).join(' ') : '' },
      { name: 'hackathons', value: Array.isArray(student.hackathons) ? student.hackathons.map(h => `${h.name || ''} ${h.project || ''} ${h.award || ''} ${h.role || ''}`).join(' ') : '' },
      { name: 'internships', value: Array.isArray(student.internships) ? student.internships.map(i => `${i.role || ''} ${i.company || ''} ${i.description || ''}`).join(' ') : '' },
      { name: 'projects', value: Array.isArray(student.projects) ? student.projects.map(p => p.title + ' ' + (p.description || '')).join(' ') : '' },
      { name: 'achievements', value: Array.isArray(student.achievements) ? student.achievements.join(' ') : '' }
    ];

    for (const field of fieldsToIndex) {
      const tokens = this.tokenize(field.value);
      for (const token of tokens) {
        if (!this.index.has(token)) {
          this.index.set(token, new Map());
        }

        const postings = this.index.get(token);
        if (!postings.has(studentId)) {
          postings.set(studentId, { count: 0, fields: new Set() });
          this.totalIndexedTerms++;
        }

        const entry = postings.get(studentId);
        entry.count++;
        entry.fields.add(field.name);
      }
    }
  }

  removeStudent(studentId) {
    for (const [token, postings] of this.index.entries()) {
      if (postings.has(studentId)) {
        postings.delete(studentId);
        this.totalIndexedTerms--;
        if (postings.size === 0) {
          this.index.delete(token);
        }
      }
    }
  }

  search(term) {
    const cleanTerm = term.trim().toLowerCase();
    const postings = this.index.get(cleanTerm);
    if (!postings) return [];

    const results = [];
    for (const [studentId, info] of postings.entries()) {
      results.push({
        studentId,
        frequency: info.count,
        matchedFields: Array.from(info.fields)
      });
    }

    return results.sort((a, b) => b.frequency - a.frequency);
  }

  searchMulti(query) {
    const tokens = this.tokenize(query);
    if (tokens.length === 0) return [];

    const studentScoreMap = new Map();

    for (const token of tokens) {
      const postings = this.index.get(token);
      if (postings) {
        for (const [studentId, info] of postings.entries()) {
          if (!studentScoreMap.has(studentId)) {
            studentScoreMap.set(studentId, {
              studentId,
              score: 0,
              matchedTokens: [],
              matchedFields: new Set()
            });
          }
          const rec = studentScoreMap.get(studentId);
          rec.score += info.count * 10;
          if (!rec.matchedTokens.includes(token)) {
            rec.matchedTokens.push(token);
          }
          info.fields.forEach(f => rec.matchedFields.add(f));
        }
      }
    }

    return Array.from(studentScoreMap.values())
      .map(r => ({
        ...r,
        matchedFields: Array.from(r.matchedFields)
      }))
      .sort((a, b) => b.score - a.score);
  }

  getPostingDetails(token) {
    const clean = token.trim().toLowerCase();
    const postings = this.index.get(clean);
    if (!postings) return null;

    return {
      token: clean,
      documentCount: postings.size,
      postings: Array.from(postings.entries()).map(([studentId, data]) => ({
        studentId,
        count: data.count,
        fields: Array.from(data.fields)
      }))
    };
  }

  getStats() {
    return {
      uniqueTokens: this.index.size,
      totalIndexedTerms: this.totalIndexedTerms
    };
  }
}

module.exports = InvertedIndex;
