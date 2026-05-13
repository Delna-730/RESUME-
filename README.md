# 🔥 AI Resume Roaster

An AI-powered resume analysis tool that provides brutal (but helpful) feedback, ATS scoring, and technical audits. Built with a premium dark-mode interface and integrated with the Hugging Face Inference API.

![Version](https://img.shields.io/badge/version-1.0.0-purple)
![License](https://img.shields.io/badge/license-MIT-blue)

## 🚀 Overview

The **AI Resume Roaster** is designed to help job seekers optimize their resumes through a mix of humor and high-tech analysis. It parses resumes (PDF/DOCX), detects skills, calculates an ATS compatibility score, and uses a Large Language Model (LLM) to "roast" the resume with witty, constructive criticism.

## ✨ Key Features

- **Multi-Format Parsing:** Support for both `.pdf` and `.docx` files using client-side libraries.
- **ATS Scoring Engine:** Calculates a 0–100 score based on keyword density, formatting, contact info, and section headers.
- **Industry-Specific Analysis:** Supports 10+ professional domains including Tech, Medical, Engineering, Aviation, Law, and more.
- **Experience-Level Tailoring:** Adjusts analysis and roast tone for Freshers, Mid-Level, and Senior professionals.
- **AI-Powered Roasts:** Uses the **Mistral-7B** model (via Hugging Face) to generate unique, humorous, and surgical feedback.
- **Offline Fallback:** A built-in rule-based engine provides feedback even if the AI API is unavailable.
- **Premium UI:** A modern, responsive dark-mode interface featuring Glassmorphism, animated score rings, and a tabbed results layout.

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3 (Vanilla), JavaScript (ES6+)
- **Parsing:** [PDF.js](https://mozilla.github.io/pdf.js/) & [Mammoth.js](https://github.com/mwilliamson/mammoth.js)
- **AI/LLM:** Hugging Face Inference API (Mistral-7B-Instruct)
- **Styling:** Modern CSS with Flexbox/Grid and Glassmorphism effects.

## 📥 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Edge, etc.)
- (Optional) A [Hugging Face API Token](https://huggingface.co/settings/tokens) for AI features.

### Installation
1. Clone or download this repository.
2. Ensure `index.html`, `style.css`, and `app.js` are in the same directory.

### Running Locally
Simply open `index.html` in your browser. No server setup is required as the application runs entirely on the client side.

## 🔑 API Configuration

To enable the AI roasting feature:
1. Open `app.js`.
2. Locate the `CONFIG` object at the top.
3. Replace the `HF_TOKEN` placeholder with your actual Hugging Face token.
   ```javascript
   const CONFIG = {
     HF_TOKEN: "your_token_here",
     HF_MODEL: "mistralai/Mistral-7B-Instruct-v0.2"
   };
   ```
4. Alternatively, you can enter the key directly in the app's **Settings Drawer** (Gear icon) without modifying the code.

## 📂 Project Structure

```text
├── index.html       # UI Structure & Library CDNs
├── style.css        # Premium Dark-Mode Design System
├── app.js           # Core Logic (Parsing, ATS, AI, Rendering)
└── README.md        # Project Documentation
```

## 🔮 Future Enhancements

- **AI Auto-Rewrite:** Suggesting actual rewritten bullet points.
- **Job Description Match:** Comparing resume against a specific JD.
- **Database Integration:** Saving user history and reports.
- **Social Sharing:** Sharing roast scores on LinkedIn/Twitter.

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

---
*Created with 🔥 for job seekers everywhere.*
