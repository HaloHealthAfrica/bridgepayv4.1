// Vercel serverless function entry point for React Router v7 with Hono
// This file must be in the api/ directory for Vercel to recognize it as a serverless function

// React Router v7 builds the server to build/server/index.js
// The server exports a default Hono app that needs to be wrapped for Vercel
import server from '../build/server/index.js';

// Vercel expects a handler function that receives (req, res)
// Hono apps can be used directly, but we need to ensure proper export
export default server;
