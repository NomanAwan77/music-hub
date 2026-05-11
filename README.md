# Music Hub (Spotify-style clone)

Full-stack music application with user authentication, album browsing, and artist-only uploads. The backend is an Express API with MongoDB and JWT cookies; the frontend is a React + TypeScript app using MUI, React Router, and a Vite dev proxy so auth cookies work during local development.

## Project layout

- `backend/` — Express server (`server.js`), auth and music routes, Mongoose models, ImageKit upload for audio files.
- `frontend/music-hub/` — Vite + React + TypeScript client with protected routes, album cards, album detail pages, and a multi-select for choosing tracks when creating an album.

## Prerequisites

- Node.js (use **20.19+** or **22.12+** if you run Vite 8; older Node may fail on `vite build` / dev).
- MongoDB connection string and a JWT secret for the backend.
- ImageKit credentials for music uploads (artist flow).

## Backend setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/` (same folder as `server.js`) with at least:

- `CONNECTION_STRING` — MongoDB URI  
- `JWT_SECRET` — secret for signing JWTs  
- `IMAGEKIT_PRIVATE_KEY` — used by `storage.service.js` for file uploads  

Start the API (default port **3000**):

```bash
npm run dev
# or: npm start
```

Main route prefixes: `POST /auth/api/register`, `POST /auth/api/login`, and under `/music/api/` for music and albums (see `backend/src/routes/`).

## Frontend setup

```bash
cd frontend/music-hub
npm install
```

The Vite config proxies `/auth/api` and `/music/api` to `http://localhost:3000`, so keep the backend running on that port or adjust `frontend/music-hub/vite.config.ts`.

Start the UI:

```bash
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Register or log in, then browse albums; artists can upload tracks and create albums from the albums page.

## Scripts summary

| Location | Command | Purpose |
|----------|---------|---------|
| `backend/` | `npm run dev` | API with nodemon |
| `backend/` | `npm start` | API with node |
| `frontend/music-hub/` | `npm run dev` | Vite dev server |
| `frontend/music-hub/` | `npm run build` | Production build |
| `frontend/music-hub/` | `npm run lint` | ESLint |

## License

ISC (backend `package.json`). Frontend is private scaffold; add your own license if you publish the repo.
