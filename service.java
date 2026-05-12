// src/main/java/com/roaster/service/ResumeService.java
@Service
public class ResumeService {

    public String extractText(MultipartFile file) throws IOException {
        String filename = file.getOriginalFilename();
        if (filename.endsWith(".pdf")) {
            PDDocument document = PDDocument.load(file.getInputStream());
            String text = new PDFTextStripper().getText(document);
            document.close();
            return text;
        } else if (filename.endsWith(".docx")) {
            XWPFDocument docx = new XWPFDocument(file.getInputStream());
            XWPFWordExtractor extractor = new XWPFWordExtractor(docx);
            return extractor.getText();
        }
        throw new IllegalArgumentException("Unsupported file format");
    }

    public String generateRoast(String resumeText) {
        // In a real app, you would send 'resumeText' to OpenAI/Gemini API
        // Prompt: "Roast this resume professionally but hilariously"
        return "Your 'Extensive experience in Hello World' is truly inspiring. " +
               "Maybe add a skill that actually pays the bills?";
    }
    
    public int calculateATSScore(String text) {
        // Simple logic: check for keywords vs length
        int score = 40; // Base score
        if (text.contains("Java") || text.contains("Python")) score += 20;
        if (text.length() > 500) score += 20;
        return Math.min(score, 100);
    }
}