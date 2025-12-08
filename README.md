# 🎯 LeetWars - Virtual Contest Platform

A MERN stack platform where users compete using LeetCode problems. Create private or public coding contests, track submissions in real-time, and climb the leaderboard!

## ✨ Features

- **🔐 User Authentication** - Secure JWT-based auth with LeetCode username linking
- **⚔️ Contest Creation** - Create custom contests with problem selection and timing
- **🔗 LeetCode Integration** - Fetches real submissions via LeetCode GraphQL API
- **📊 Live Leaderboard** - ACM/ICPC style ranking (by solved count, then penalty)
- **⏱️ Real-time Sync** - Validate submissions with timestamp checking
- **🎨 Premium UI** - Dark theme with glassmorphism, gradients, and smooth animations

## 🏗️ Architecture

```
leetwars/
├── server/           # Backend (Node.js + Express + MongoDB)
│   ├── models/       # Mongoose schemas
│   ├── routes/       # API endpoints
│   ├── services/     # LeetCode API integration
│   ├── middleware/   # Auth middleware
│   └── config/       # Database config
│
└── client/           # Frontend (React + Vite + Tailwind)
    ├── src/
    │   ├── pages/    # Main pages
    │   ├── components/  # Reusable components
    │   ├── context/  # Auth context
    │   └── utils/    # API utilities
    └── public/
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- MongoDB (local or Atlas)

### 1. Setup Server

```bash
cd server

# Install dependencies
npm install
npm install nanoid@3

# Configure environment (.env already exists)
# Update MONGODB_URI if needed

# Seed sample problems
node seed.js

# Start server
npm start
```

Server will run on `http://localhost:5000`

### 2. Setup Client

```bash
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

Client will run on `http://localhost:3000`

## 📋 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Contests
- `POST /api/contests/create` - Create contest
- `POST /api/contests/enroll/:code` - Join contest
- `GET /api/contests/:code` - Get contest details
- `GET /api/contests/my/enrolled` - User's enrolled contests
- `GET /api/contests/my/created` - User's created contests

### Sync & Leaderboard
- `POST /api/sync/:contestId` - Sync LeetCode submissions
- `GET /api/sync/leaderboard/:contestId` - Get leaderboard

### Problems
- `GET /api/problems/search` - Search problems
- `GET /api/problems/:slug` - Get problem details

## 🎮 How to Use

### For Contestants:
1. **Register/Login** - Link your LeetCode username
2. **Join Contest** - Enter contest code or browse available contests
3. **Wait in Lobby** - View countdown and contest details
4. **Compete** - Solve problems on LeetCode during contest time
5. **Sync Score** - Click "Sync" button to update leaderboard
6. **Track Progress** - Watch live leaderboard updates

### For Contest Creators:
1. **Create Contest** - Click "Create New Contest"
2. **Select Problems** - Search and select from LeetCode problems
3. **Set Timing** - Choose start time and duration
4. **Share Code** - Distribute unique contest code to participants
5. **Monitor** - Watch participants compete in real-time

## 🧮 Scoring Algorithm

**ACM/ICPC Style:**
- Primary: Total problems solved (descending)
- Tiebreaker: Total penalty time (ascending)

**Penalty Calculation:**
```
Penalty = (Solve Time - Contest Start) + (5 minutes × Wrong Attempts)
```

Only submissions within contest timeframe count!

## 🔒 Security Features

- JWT authentication with httpOnly tokens
- Password hashing with bcrypt
- Protected API routes
- Rate limiting on sync (10 seconds between syncs)
- Input validation and sanitization

## 🎨 Design Highlights

- **Dark Theme** - Easy on the eyes
- **Glassmorphism** - Modern frosted glass effects
- **Smooth Animations** - Fade-in, slide-up, pulse effects
- **Gradient Accents** - Vibrant color gradients
- **Responsive** - Works on all screen sizes
- **Custom Scrollbar** - Styled for dark theme

## ⚠️ Important Notes

1. **LeetCode Profile Must Be Public**
   - Users must set their LeetCode submissions to PUBLIC
   - Private profiles cannot be tracked

2. **Sync is Manual**
   - Users click "Sync" button to update scores
   - Prevents API rate limiting
   - Eventually consistent leaderboard

3. **Timestamp Validation**
   - Only submissions during contest time count
   - Start time < Submission time < End time

4. **No Code Verification**
   - Platform trusts LeetCode's "Accepted" status
   - No plagiarism detection (out of scope)

## 🐛 Known Limitations

- No real-time WebSocket updates (uses polling)
- LeetCode API rate limits (hence manual sync)
- No email verification system
- No password reset functionality
- Sample problems only (needs comprehensive database)

## 🔮 Future Enhancements

- [ ] WebSocket for real-time leaderboard
- [ ] Email notifications
- [ ] Advanced problem filters
- [ ] Contest templates
- [ ] User profiles and statistics
- [ ] Contest history and analytics
- [ ] Team competitions
- [ ] Automated problem fetching from LeetCode

## 📜 License

MIT License - Feel free to use for learning!

## 🙏 Credits

- LeetCode for GraphQL API
- React + Vite for fast development
- Tailwind CSS for styling
- MongoDB for data storage

---

**Built with ❤️ for competitive programmers**
