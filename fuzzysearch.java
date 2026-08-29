import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;

public class fuzzysearch {

    public static class StudentRecord {
        private String id;
        private String name;
        private String major;

        public StudentRecord(String id, String name, String major) {
            this.id = id;
            this.name = name;
            this.major = major;
        }

        public String getId() { return id; }
        public String getName() { return name; }
        public String getMajor() { return major; }
    }

    public static class MatchResult {
        private StudentRecord record;
        private double similarityScore;

        public MatchResult(StudentRecord record, double similarityScore) {
            this.record = record;
            this.similarityScore = similarityScore;
        }

        @Override
        public String toString() {
            return String.format("Score: %5.2f%% | ID: %-12s | Name: %-18s | Major: %s", 
                    similarityScore * 100, record.getId(), record.getName(), record.getMajor());
        }
    }

    // Reads student records dynamically from an external CSV file
    public static List<StudentRecord> loadRecordsFromFile(String filePath) {
        List<StudentRecord> records = new ArrayList<>();
        try (BufferedReader br = new BufferedReader(new FileReader(filePath))) {
            String line;
            boolean isHeader = true;

            while ((line = br.readLine()) != null) {
                if (line.trim().isEmpty()) continue;

                // Skip header row
                if (isHeader) {
                    isHeader = false;
                    if (line.toLowerCase().contains("id") || line.toLowerCase().contains("name")) {
                        continue;
                    }
                }

                String[] parts = line.split(",");
                if (parts.length >= 3) {
                    records.add(new StudentRecord(parts[0].trim(), parts[1].trim(), parts[2].trim()));
                }
            }
        } catch (IOException e) {
            System.err.println("Error reading file: " + e.getMessage());
        }
        return records;
    }

    // Dynamic Programming implementation of Levenshtein Edit Distance
    public static int computeLevenshteinDistance(String s1, String s2) {
        int[][] dp = new int[s1.length() + 1][s2.length() + 1];

        for (int i = 0; i <= s1.length(); i++) {
            for (int j = 0; j <= s2.length(); j++) {
                if (i == 0) {
                    dp[i][j] = j;
                } else if (j == 0) {
                    dp[i][j] = i;
                } else {
                    int cost = (s1.charAt(i - 1) == s2.charAt(j - 1)) ? 0 : 1;
                    dp[i][j] = Math.min(Math.min(
                        dp[i - 1][j] + 1,        // Deletion
                        dp[i][j - 1] + 1),       // Insertion
                        dp[i - 1][j - 1] + cost  // Substitution
                    );
                }
            }
        }
        return dp[s1.length()][s2.length()];
    }

    public static List<MatchResult> fuzzySearchByName(List<StudentRecord> records, String queryName, double minThreshold) {
        List<MatchResult> results = new ArrayList<>();
        String qLower = queryName.toLowerCase();

        for (StudentRecord record : records) {
            String nLower = record.getName().toLowerCase();
            int distance = computeLevenshteinDistance(qLower, nLower);
            int maxLen = Math.max(qLower.length(), nLower.length());
            
            // Normalized similarity ratio (0.0 to 1.0)
            double similarity = 1.0 - ((double) distance / maxLen);

            if (similarity >= minThreshold) {
                results.add(new MatchResult(record, similarity));
            }
        }
        
        // Sort results by similarity score in descending order
        results.sort((a, b) -> Double.compare(b.similarityScore, a.similarityScore));
        return results;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        // 1. Take input CSV file path from user
        System.out.print("Enter the CSV file path (e.g., students_fuzzy.csv): ");
        String filePath = scanner.nextLine().trim();

        // 2. Load records from file
        List<StudentRecord> records = loadRecordsFromFile(filePath);

        if (records.isEmpty()) {
            System.out.println("No records found or file could not be read.");
            scanner.close();
            return;
        }

        System.out.println("\nSuccessfully loaded " + records.size() + " records from file!\n");

        // 3. Search loop
        while (true) {
            System.out.print("Enter name to search (or type 'exit' to quit): ");
            String query = scanner.nextLine().trim();

            if (query.equalsIgnoreCase("exit")) {
                System.out.println("Exiting fuzzy search engine. Goodbye!");
                break;
            }

            List<MatchResult> matches = fuzzySearchByName(records, query, 0.55);

            System.out.println("\n--- Search Results (" + matches.size() + " matched) ---");
            if (matches.isEmpty()) {
                System.out.println("No matching names found above threshold.");
            } else {
                for (MatchResult res : matches) {
                    System.out.println(res);
                }
            }
            System.out.println("----------------------------------------------\n");
        }

        scanner.close();
    }
}