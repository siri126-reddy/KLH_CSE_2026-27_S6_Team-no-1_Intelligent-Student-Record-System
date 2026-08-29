import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.*;

public class documentfrequency {

    public static class DocumentRecord {
        private String docId;
        private String content;

        public DocumentRecord(String docId, String content) {
            this.docId = docId;
            this.content = content;
        }

        public String getDocId() { return docId; }
        public String getContent() { return content; }
    }

    public static class SimilarityResult {
        private String docId;
        private String snippet;
        private double similarityScore;

        public SimilarityResult(String docId, String snippet, double similarityScore) {
            this.docId = docId;
            this.snippet = snippet;
            this.similarityScore = similarityScore;
        }

        @Override
        public String toString() {
            return String.format("Score: %.4f | Doc: %-8s | Snippet: %s...", 
                    similarityScore, docId, snippet);
        }
    }

    // Reads multiple document paragraphs separated by '---'
    public static List<DocumentRecord> loadDocumentsFromFile(String filePath) {
        List<DocumentRecord> documents = new ArrayList<>();

        try (BufferedReader br = new BufferedReader(new FileReader(filePath))) {
            String line;
            StringBuilder currentDoc = new StringBuilder();
            int docCounter = 1;

            while ((line = br.readLine()) != null) {
                // '---' delimiter marks end of a document paragraph
                if (line.trim().equals("---")) {
                    if (currentDoc.length() > 0) {
                        documents.add(new DocumentRecord("Doc-" + docCounter++, currentDoc.toString().trim()));
                        currentDoc.setLength(0);
                    }
                } else {
                    if (currentDoc.length() > 0) {
                        currentDoc.append(" ");
                    }
                    currentDoc.append(line.trim());
                }
            }
            // Capture last paragraph if missing trailing delimiter
            if (currentDoc.length() > 0) {
                documents.add(new DocumentRecord("Doc-" + docCounter, currentDoc.toString().trim()));
            }

        } catch (IOException e) {
            System.err.println("Error reading file: " + e.getMessage());
        }

        return documents;
    }

    // Rank document paragraphs by Cosine Similarity
    public static List<SimilarityResult> rankDocuments(List<DocumentRecord> documents, String queryParagraph) {
        List<String> corpus = new ArrayList<>();
        for (DocumentRecord doc : documents) {
            corpus.add(doc.getContent().toLowerCase());
        }
        corpus.add(queryParagraph.toLowerCase());

        // Build Vocabulary Matrix
        Set<String> vocabSet = new HashSet<>();
        for (String doc : corpus) {
            vocabSet.addAll(Arrays.asList(doc.split("\\W+")));
        }
        vocabSet.remove("");
        List<String> vocabulary = new ArrayList<>(vocabSet);

        // Compute Term Frequency (TF) Vectors
        List<double[]> tfVectors = new ArrayList<>();
        for (String doc : corpus) {
            List<String> words = Arrays.asList(doc.split("\\W+"));
            double[] vector = new double[vocabulary.size()];
            for (int i = 0; i < vocabulary.size(); i++) {
                vector[i] = Collections.frequency(words, vocabulary.get(i));
            }
            tfVectors.add(vector);
        }

        double[] queryVector = tfVectors.get(tfVectors.size() - 1);
        List<SimilarityResult> results = new ArrayList<>();

        // Match Query Vector against each Document Vector
        for (int i = 0; i < documents.size(); i++) {
            double similarity = calculateCosineSimilarity(queryVector, tfVectors.get(i));
            if (similarity > 0) {
                String content = documents.get(i).getContent();
                String snippet = content.length() > 55 ? content.substring(0, 55) : content;
                results.add(new SimilarityResult(documents.get(i).getDocId(), snippet, similarity));
            }
        }

        // Sort descending by similarity score
        results.sort((a, b) -> Double.compare(b.similarityScore, a.similarityScore));
        return results;
    }

    private static double calculateCosineSimilarity(double[] vecA, double[] vecB) {
        double dotProduct = 0.0, normA = 0.0, normB = 0.0;
        for (int i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return (normA == 0 || normB == 0) ? 0.0 : dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        System.out.print("Enter document file path (e.g., documents.txt): ");
        String filePath = scanner.nextLine().trim();

        List<DocumentRecord> documents = loadDocumentsFromFile(filePath);

        if (documents.isEmpty()) {
            System.out.println("No document paragraphs found in file.");
            scanner.close();
            return;
        }

        System.out.println("\nLoaded " + documents.size() + " document paragraphs from file!\n");

        while (true) {
            System.out.print("Enter query paragraph (or type 'exit' to quit): ");
            String query = scanner.nextLine().trim();

            if (query.equalsIgnoreCase("exit")) {
                System.out.println("Exiting engine. Goodbye!");
                break;
            }

            List<SimilarityResult> matches = rankDocuments(documents, query);

            System.out.println("\n--- Document Ranking Results (" + matches.size() + " matched) ---");
            if (matches.isEmpty()) {
                System.out.println("No documents matched the input query.");
            } else {
                for (SimilarityResult res : matches) {
                    System.out.println(res);
                }
            }
            System.out.println("----------------------------------------------------------\n");
        }

        scanner.close();
    }
}
