<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/53cff653-e934-4eea-8bbb-21f4a24222d5

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy the website on Netlify

The application source must be present at the repository root; a ZIP archive alone
cannot be served as a website. `netlify.toml` configures Netlify to install the npm
dependencies, run `npm run build`, and publish the generated `dist` directory.
The fallback rewrite serves the React entry point for direct page links and refreshes.

This configuration publishes the frontend. The local Express server in `server.ts`,
including its `/api/chat` endpoint, is not deployed by the static site configuration.
