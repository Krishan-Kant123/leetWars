# DeepSeek AI Bot Integration

## Setup Instructions

### 1. Get DeepSeek API Key
1. Go to https://platform.deepseek.com/
2. Sign up for free account
3. Generate API key from dashboard
4. Copy the API key

### 2. Add to Environment Variables
Add to `server/.env`:
```env
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

### 3. Install Dependencies
```bash
cd server
npm install axios
```

## Features

### 1. **Progress Analysis**
- Analyzes user's LeetCode stats
- Identifies weak areas
- Provides improvement suggestions
- Tracks progress over time

### 2. **Roast Mode** 🔥
- Humorous roasting based on stats
- Compares to average users
- Highlights funny patterns
- Motivational (in a roast-y way)

### 3. **Chat Assistant**
- Ask questions about your progress
- Get study recommendations
- Topic-specific advice
- Problem-solving strategies

## API Endpoints

### POST /api/bot/chat
Send message to bot

**Request:**
```json
{
  "message": "How am I doing?",
  "mode": "analyze" | "roast" | "chat"
}
```

**Response:**
```json
{
  "reply": "Bot's response...",
  "suggestions": ["tip1", "tip2"]
}
```

### GET /api/bot/analysis
Get detailed progress analysis

**Response:**
```json
{
  "strengths": ["Arrays", "DP"],
  "weaknesses": ["Graphs", "Trees"],
  "recommendations": [...],
  "overallScore": 75
}
```

### GET /api/bot/roast
Get roasted by the bot 🔥

**Response:**
```json
{
  "roast": "Funny roast message...",
  "severity": "mild" | "medium" | "savage"
}
```

## Usage

### Frontend Component
```jsx
import BotChat from './components/BotChat';

<BotChat />
```

### Mode Selection
- **Analyze**: Serious progress analysis
- **Roast**: Funny roasting
- **Chat**: General questions

## Example Interactions

### Analyze Mode
**User:** "How am I doing?"
**Bot:** "You've solved 150 problems! Your strength is in Arrays (45 solved) but you're weak in Graphs (only 8 solved). Focus more on Graph problems to improve your overall skills."

### Roast Mode
**User:** "Roast me!"
**Bot:** "150 problems and still stuck on Easy? My grandma solves Hards faster! 😂 You've spent 3 months on LeetCode and solved fewer problems than a motivated beginner does in a week. Time to step up your game or stick to FizzBuzz!"

### Chat Mode
**User:** "Should I focus on DP?"
**Bot:** "Based on your stats, yes! You've only solved 12/200 DP problems. DP is crucial for interviews. Start with easy DP problems like Climbing Stairs and Fibonacci."

## Bot Personality

- **Analyze**: Professional, helpful, data-driven
- **Roast**: Savage, funny, brutally honest
- **Chat**: Friendly, supportive, knowledgeable

## Implementation Status

✅ Backend service created
✅ DeepSeek API integration
✅ Chat endpoint
✅ Analysis endpoint
✅ Roast endpoint
⏳ Frontend chat UI (next step)
⏳ Animations integration

## Next Steps

1. Create chat UI component
2. Add floating bot button
3. Integrate with battle animations
4. Add voice responses (optional)
