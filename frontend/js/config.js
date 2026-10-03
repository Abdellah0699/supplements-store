/**
 * config.js
 * ---------------------------------------------------------
 * The ONLY place the backend's URL is configured. Every other file
 * reads window.APP_CONFIG.API_BASE_URL instead of hardcoding it.
 *
 * Deploying the frontend and backend separately (e.g. frontend on
 * Netlify, backend on Render) means changing exactly this one line -
 * nothing else in the project needs to know the backend's address.
 * ---------------------------------------------------------
 */

window.APP_CONFIG = {
  API_BASE_URL: 'http://localhost:5000/api',
};
