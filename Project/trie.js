class TrieNode {
  constructor() {
    this.children = {};
    this.isEndOfWord = false;
    this.entries = []; // Array of { id, text, type }
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
    this.totalWords = 0;
  }

  insert(text, studentId, type) {
    if (!text || typeof text !== 'string') return;
    const cleanText = text.trim().toLowerCase();
    if (!cleanText) return;

    let curr = this.root;
    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      if (!curr.children[char]) {
        curr.children[char] = new TrieNode();
      }
      curr = curr.children[char];
    }

    if (!curr.isEndOfWord) {
      curr.isEndOfWord = true;
      this.totalWords++;
    }

    const exists = curr.entries.some(e => e.id === studentId && e.type === type);
    if (!exists) {
      curr.entries.push({ id: studentId, text: text.trim(), type });
    }
  }

  searchPrefix(prefix, maxResults = 10) {
    if (!prefix || typeof prefix !== 'string') return [];
    const cleanPrefix = prefix.trim().toLowerCase();
    if (!cleanPrefix) return [];

    let curr = this.root;
    let pathTaken = '';

    for (let i = 0; i < cleanPrefix.length; i++) {
      const char = cleanPrefix[i];
      if (!curr.children[char]) {
        return [];
      }
      curr = curr.children[char];
      pathTaken += char;
    }

    const results = [];
    const seenTexts = new Set();
    const queue = [{ node: curr, word: pathTaken }];

    while (queue.length > 0 && results.length < maxResults) {
      const item = queue.shift();
      const node = item.node;
      const word = item.word;

      if (node.isEndOfWord && node.entries.length > 0) {
        for (const entry of node.entries) {
          const key = entry.text.toLowerCase() + '|' + entry.type;
          if (!seenTexts.has(key)) {
            seenTexts.add(key);
            results.push({
              match: entry.text,
              type: entry.type,
              studentId: entry.id,
              prefixLength: cleanPrefix.length
            });
            if (results.length >= maxResults) break;
          }
        }
      }

      for (const [char, childNode] of Object.entries(node.children)) {
        queue.push({ node: childNode, word: word + char });
      }
    }

    return results;
  }

  remove(text, studentId) {
    if (!text || typeof text !== 'string') return;
    const cleanText = text.trim().toLowerCase();

    const deleteHelper = (node, depth) => {
      if (!node) return false;

      if (depth === cleanText.length) {
        if (node.isEndOfWord) {
          node.entries = node.entries.filter(e => e.id !== studentId);
          if (node.entries.length === 0) {
            node.isEndOfWord = false;
            this.totalWords--;
          }
        }
        return Object.keys(node.children).length === 0 && !node.isEndOfWord;
      }

      const char = cleanText[depth];
      if (!node.children[char]) return false;

      const shouldDeleteChild = deleteHelper(node.children[char], depth + 1);
      if (shouldDeleteChild) {
        delete node.children[char];
        return Object.keys(node.children).length === 0 && !node.isEndOfWord;
      }

      return false;
    };

    deleteHelper(this.root, 0);
  }
}

module.exports = Trie;
