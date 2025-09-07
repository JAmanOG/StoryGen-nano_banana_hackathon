
# Storybook Frontend

## Installation Steps

1. **Navigate to the frontend directory**
   ```sh
   cd nano_banana_hackathon/storybook-app
   ```

2. **Install dependencies**
   ```sh
   npm install
   ```
   or if you use pnpm:
   ```sh
   pnpm install
   ```

3. **Set up environment variables**
   - Create a `.env` file in the `storybook-app` directory.
   - Add any required environment variables (API URLs, etc). Example:
     ```
     NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
     ```
   - Adjust as needed for your deployment.

4. **Run the frontend development server**
   ```sh
   npm run dev
   ```
   or with pnpm:
   ```sh
   pnpm dev
   ```

5. **Access the app**
   - Visit [http://localhost:3000](http://localhost:3000) in your browser.

## Notes

- The frontend is built with Next.js and TypeScript.
- Make sure the backend is running and accessible at the URL specified in your `.env`.
- For production, build with:
  ```sh
  npm run build
  npm start
  ```

---
# Storybook Backend

## Installation Steps

1. **Clone the repository**
   ```sh
   git clone <your-repo-url>
   cd nano_banana_hackathon/backend
   ```

2. **Install dependencies**
   ```sh
   npm install
   ```

3. **Set up environment variables**
   - Create a `.env` file in the `backend` directory.
   - Add your Google Gemini API keys:
     ```
     GOOGLE_API_KEY=your_gemini_api_key
     CONTEXT_GOOGLE_API_KEY=your_context_gemini_api_key 
     ```
   - (Optional) Set `PORT` if you want a custom port.

4. **Run the backend server**
   ```sh
   npm run dev
   ```
   or for production:
   ```sh
   npm start
   ```

5. **Verify the server is running**
   - Visit [http://localhost:3001/health](http://localhost:3001/health) in your browser.
   - You should see `{ "ok": true }`.

## Notes

- The backend exposes endpoints for file upload, story generation, and image generation.
- Make sure your API keys have access to Gemini 2.5 Flash Image and Gemini 2.0 Flash models.
- Uploaded images are stored in the `uploads` directory and served at `/uploads/<filename>`.

