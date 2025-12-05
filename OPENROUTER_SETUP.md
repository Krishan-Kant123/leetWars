# 🤖 AI Bot Setup - OpenRouter (FREE GPT)

## ✅ FIXED - Now Using Native Fetch API

**No SDK installation needed!** Just add your API key.

---

## 🚀 Super Quick Setup (2 Steps!)

### Step 1: Get Free API Key
1. Go to **https://openrouter.ai/**
2. Sign in with Google/GitHub
3. Go to **"Keys"** section
4. Click **"Create Key"**
5. Copy your API key

**100% FREE - No payment required!**

---

### Step 2: Add to Environment
Edit `server/.env`:
```env
OPENROUTER_API_KEY=your_api_key_here
```

**Replace `your_api_key_here` with your actual key.**

---

### Step 3: Restart Server
```bash
# Stop server (Ctrl+C)
cd server
npm run dev
```

---

## ✅ That's It!

**No npm install needed!** Uses native fetch API.

Test it:
1. Open Dashboard
2. Click 🤖 button (bottom-right)
3. Try "Roast me!" 🔥
4. Get instant AI response!

---

## 🎮 Features

### 💬 Chat Mode
Ask anything:
- "Should I focus on DP?"
- "How do I improve at graphs?"
- "What should I practice?"

### 📊 Analyze Mode
Get analysis:
- Strengths & weaknesses
- Improvement areas
- Recommendations
- Overall assessment

### 🔥 Roast Mode
Get roasted:
- **Mild** - Playful
- **Medium** - Witty
- **Savage** - Brutal! 😂

### 💡 Suggestions
Study plan:
- Focus topics
- Difficulty balance
- Problem recommendations
- Weekly goals

---

## 💡 Example Roast

**User:** "Roast me!"

**Bot:** "150 problems in 3 months? My grandma's faster and she uses a typewriter! 😂 

Your Graph skills are SO weak, even trees feel bad for you! You've been grinding LeetCode for 90 days and still scared of Medium difficulty?

BUT... I see the fire in you. Time to PROVE IT!

**Challenge:** 10 Medium problems this week or admit you're just here for the memes! 🔥💪"

---

## 🔧 Troubleshooting

### "Failed to get response"
✅ **Solution:**
1. Check `server/.env` has your API key
2. Make sure key is complete (no spaces)
3. Restart server: `npm run dev`

### Bot button not visible
✅ **Solution:**
- Open Dashboard page
- Look bottom-right corner
- Purple glowing 🤖 button

### Still not working?
✅ **Check:**
```bash
# In server directory
cat .env | grep OPENROUTER
# Should show: OPENROUTER_API_KEY=sk-or-...
```

---

## 🌟 Why This Is Awesome

1. ✅ **FREE** - No payment
2. ✅ **GPT-3.5** - Real AI
3. ✅ **FAST** - Instant responses
4. ✅ **SIMPLE** - Just API key
5. ✅ **FUN** - Roasts are hilarious!

---

## 📝 Quick Summary

1. Get free key: https://openrouter.ai/ ✅
2. Add to `.env`: `OPENROUTER_API_KEY=...` ✅
3. Restart server ✅
4. Click 🤖 button ✅
5. Enjoy AI coach! 🎉

**No SDK, no installation, just works! 🚀**
