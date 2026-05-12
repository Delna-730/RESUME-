// src/main/java/com/roaster/controller/RoastController.java
@RestController
@RequestMapping("/api/resume")
@CrossOrigin(origins = "*") // For frontend development
public class RoastController {

    @Autowired
    private ResumeService resumeService;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadResume(@RequestParam("file") MultipartFile file) {
        try {
            String text = resumeService.extractText(file);
            int score = resumeService.calculateATSScore(text);
            String roast = resumeService.generateRoast(text);

            Map<String, Object> response = new HashMap<>();
            response.put("score", score);
            response.put("roast", roast);
            response.put("status", "Success");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error processing resume: " + e.getMessage());
        }
    }
}