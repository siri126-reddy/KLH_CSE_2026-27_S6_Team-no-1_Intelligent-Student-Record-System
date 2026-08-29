import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;
import java.util.regex.Pattern;

public class PatternSearchEngineFile {

    // Helper class to store student data
    public static class Student {
        String id;
        String name;
        String email;

        public Student(String id, String name, String email) {
            this.id = id;
            this.name = name;
            this.email = email;
        }

        @Override
        public String toString() {
            return String.format("ID: %-12s | Name: %-15s | Email: %s", id, name, email);
        }
    }

    // Reads student records dynamically from an external CSV file path
    public static List<Student> readStudentsFromFile(String filePath) {
        List<Student> students = new ArrayList<>();

        try (BufferedReader br = new BufferedReader(new FileReader(filePath))) {
            String line;
            boolean isHeader = true;

            while ((line = br.readLine()) != null) {
                // Skip empty lines
                if (line.trim().isEmpty()) {
                    continue;
                }

                // Skip header line if present
                if (isHeader) {
                    isHeader = false;
                    if (line.toLowerCase().contains("id") || line.toLowerCase().contains("name")) {
                        continue;
                    }
                }

                String[] data = line.split(",");
                if (data.length >= 3) {
                    String id = data[0].trim();
                    String name = data[1].trim();
                    String email = data[2].trim();
                    students.add(new Student(id, name, email));
                }
            }
        } catch (IOException e) {
            System.err.println("Error reading file: " + e.getMessage());
        }

        return students;
    }

    // Search using Regex patterns against id, name, or email
    public static List<Student> searchByPattern(List<Student> students, String regexPattern) {
        Pattern pattern = Pattern.compile(regexPattern, Pattern.CASE_INSENSITIVE);
        List<Student> matches = new ArrayList<>();

        for (Student s : students) {
            if (pattern.matcher(s.id).find() || 
                pattern.matcher(s.email).find() || 
                pattern.matcher(s.name).find()) {
                matches.add(s);
            }
        }
        return matches;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        // 1. Take input CSV file path from user
        System.out.print("Enter the CSV file path (e.g., students.csv): ");
        String filePath = scanner.nextLine().trim();

        // 2. Load records from the provided file
        List<Student> students = readStudentsFromFile(filePath);

        if (students.isEmpty()) {
            System.out.println("No records found or file could not be read.");
            scanner.close();
            return;
        }

        System.out.println("\nSuccessfully loaded " + students.size() + " records from file!\n");

        // 3. Search loop
        while (true) {
            System.out.print("Enter Regex search pattern (or type 'exit' to quit): ");
            String searchPattern = scanner.nextLine().trim();

            if (searchPattern.equalsIgnoreCase("exit")) {
                System.out.println("Exiting search engine. Goodbye!");
                break;
            }

            List<Student> results = searchByPattern(students, searchPattern);

            System.out.println("\n--- Search Results (" + results.size() + " matched) ---");
            if (results.isEmpty()) {
                System.out.println("No matching records found.");
            } else {
                for (Student s : results) {
                    System.out.println(s);
                }
            }
            System.out.println("----------------------------------------------\n");
        }

        scanner.close();
    }
}