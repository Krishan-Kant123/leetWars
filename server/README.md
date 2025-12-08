# LeetWars Backend Server

## ✅ Setup Complete!

The backend server is fully configured with:

### Features Implemented:
- ✅ **Authentication System** (JWT-based)
- ✅ **Contest Management** (Create, Enroll, Retrieve)
- ✅ **LeetCode Sync** (Submission validation with penalty calculation)
- ✅ **Leaderboard** (ACM/ICPC style ranking)
- ✅ **Problem Search** (Filter by difficulty and tags)

### Database Models:
- ✅ User (with LeetCode username)
- ✅ Contest (with timing and problems)
- ✅ Problem (cached LeetCode data)
- ✅ Participation (leaderboard tracking)

## Setup Instructions:

### 1. Install nanoid package
```bash
cd server
npm install nanoid@3
```

### 2. Make sure MongoDB is running
You can use:
- Local MongoDB installation
- MongoDB Atlas (cloud)
- Or update `.env` with your MongoDB connection string

### 3. Seed the database with sample problems
```bash
node seed.js
```

### 4. Start the server
```bash
npm start
```

Or for development with auto-reload:
```bash
npm install -D nodemon
npm run dev
```

## API Endpoints:

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Contests
- `POST /api/contests/create` - Create new contest
- `POST /api/contests/enroll/:code` - Enroll in contest
- `GET /api/contests/:code` - Get contest details
- `GET /api/contests/my/enrolled` - Get enrolled contests
- `GET /api/contests/my/created` - Get created contests

### Sync & Leaderboard
- `POST /api/sync/:contestId` - Sync LeetCode submissions
- `GET /api/sync/leaderboard/:contestId` - Get leaderboard

### Problems
- `GET /api/problems/search?query=...&difficulty=...&tags=...` - Search problems
- `GET /api/problems/:slug` - Get problem by slug

## Environment Variables (.env):
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/leetwars
JWT_SECRET=your_jwt_secret_key_change_this_in_production
```

## Next Steps:
- Frontend setup with React + Vite
- UI implementation
- Integration testing
