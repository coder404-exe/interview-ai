# InterviewAI

An impressive, AI-powered mock interview platform designed to provide a realistic interview experience. It adapts to your resume, tracks your emotions, evaluates your speech fluency, and provides deep analytics to help you land your dream job.

## Features

- **Adaptive AI Interviewer:** Powered by Google Gemini to tailor questions based on your specific role and resume.
- **Real-time Emotion Tracking:** Utilizes face-api.js to detect confidence, nervousness, and engagement.
- **Speech Analysis:** Tracks words-per-minute (WPM), filler words, and calculates an overall fluency score.
- **Technical Code Editor:** Built-in Monaco editor with Piston API execution for coding rounds.
- **Detailed Analytics Reports:** View radar charts and deep breakdowns of your communication, technical skills, and confidence.
- **Interactive 3D Avatar:** A reactive AI avatar built with React Three Fiber.

## Tech Stack

- **Frontend:** React 19, Vite 8, React Router v7
- **Styling:** Vanilla CSS, Framer Motion
- **AI Backend:** Google Gemini API (`gemini-2.0-flash` with fallbacks)
- **Database / Auth:** Supabase (with localStorage fallback)
- **3D Graphics:** Three.js / React Three Fiber
- **Charts:** Recharts

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd software
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Environment Variables

Copy the example environment file and fill in your keys:

```bash
cp .env.example .env
```

Required variables in `.env`:
- `VITE_GEMINI_API_KEY`: Your Google Gemini API Key
- `VITE_SUPABASE_URL`: Your Supabase Project URL (Optional for DB sync)
- `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key (Optional)

## Running Locally

To start the Vite development server:
```bash
npm run dev
```

## Build Instructions

To build the project for production:
```bash
npm run build
```
To preview the production build locally:
```bash
npm run preview
```

## License
MIT
