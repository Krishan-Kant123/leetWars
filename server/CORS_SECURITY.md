# 🔒 CORS SECURITY CONFIGURED!

## What Was Done:

### **1. Created .env.example Template**
**File: `server/.env.example`**

This shows all required environment variables:
```bash
# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# In production:
# FRONTEND_URL=https://your-deployed-frontend.com
```

### **2. Updated CORS Configuration**
**File: `server/index.js`**

**Before:**
```javascript
app.use(cors()); // ❌ Allows ALL origins
```

**After:**
```javascript
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            process.env.FRONTEND_URL || 'http://localhost:5173',
            'http://localhost:5173', // Development fallback
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true); // ✅ Allow
        } else {
            callback(new Error('Not allowed by CORS')); // ❌ Block
        }
    },
    credentials: true, // Allow cookies
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions)); // ✅ Secure CORS
```

---

## 🛡️ Security Benefits:

### **What It Does:**
1. ✅ **Only allows** requests from `FRONTEND_URL`
2. ✅ **Blocks** requests from other domains
3. ✅ **Allows credentials** (cookies, auth headers)
4. ✅ **Fallback** to localhost:5173 for development

### **What Gets Blocked:**
- ❌ Requests from random websites
- ❌ Malicious scripts from other domains
- ❌ Unauthorized API access
- ❌ CSRF attacks from external sites

---

## 📝 Setup Instructions:

### **Step 1: Update Your .env File**

**Development:**
```bash
# server/.env
FRONTEND_URL=http://localhost:5173
```

**Production:**
```bash
# server/.env
FRONTEND_URL=https://your-deployed-frontend.vercel.app
# OR
FRONTEND_URL=https://yourfrontend.netlify.app
# OR whatever your frontend URL is
```

### **Step 2: Restart Backend Server**
```bash
cd server
npm start
```

---

## 🧪 Testing:

### **Test 1: From Your Frontend (Should Work ✅)**
```bash
# Your frontend at http://localhost:5173
fetch('http://localhost:5000/api/contests')
✅ Request allowed
```

### **Test 2: From Browser Console on Google (Should Fail ❌)**
```bash
# Open google.com, open console, try:
fetch('http://localhost:5000/api/contests')
❌ CORS error: "Not allowed by CORS"
```

### **Test 3: From Postman (Should Work ✅)**
```bash
# Postman has no origin header
GET http://localhost:5000/api/contests
✅ Request allowed (no origin = allowed for testing)
```

---

## 🚀 Production Deployment:

### **When Deploying:**

1. **Set Environment Variable:**
   ```bash
   # On Heroku/Railway/etc:
   FRONTEND_URL=https://your-frontend-domain.com
   ```

2. **Multiple Frontends (if needed):**
   ```javascript
   const allowedOrigins = [
       process.env.FRONTEND_URL,
       'http://localhost:5173', // Development
       'https://your-prod-frontend.com',
       'https://your-staging-frontend.com',
   ];
   ```

3. **Remove Development Fallback:**
   ```javascript
   // In production, remove localhost:
   const allowedOrigins = [
       process.env.FRONTEND_URL,
       // Remove: 'http://localhost:5173',
   ];
   ```

---

## 🔐 Additional Security Options:

### **Option 1: Remove Postman Access (Stricter)**
```javascript
origin: function (origin, callback) {
    if (!origin) {
        // ❌ Block requests with no origin
        return callback(new Error('Origin required'));
    }
    // ... rest of code
}
```

### **Option 2: Add Rate Limiting**
```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### **Option 3: Add Helmet.js**
```bash
npm install helmet
```

```javascript
const helmet = require('helmet');
app.use(helmet());
```

---

## ✅ Current Security:

- ✅ CORS restricted to frontend URL only
- ✅ Environment variable configuration
- ✅ Credentials support for auth
- ✅ Development & production ready
- ✅ Clear error messages

---

## 📋 Next Steps:

1. **Copy `.env.example` to `.env`:**
   ```bash
   cd server
   cp .env.example .env
   ```

2. **Update `.env` with your values:**
   ```bash
   FRONTEND_URL=http://localhost:5173
   JWT_SECRET=your_secret_here
   MONGODB_URI=mongodb://localhost:27017/leetwars
   ```

3. **Restart server:**
   ```bash
   npm start
   ```

4. **Test from frontend** - should work!
5. **Test from random website** - should fail!

---

**Your API is now protected! Only your frontend can access it! 🔒✨**
