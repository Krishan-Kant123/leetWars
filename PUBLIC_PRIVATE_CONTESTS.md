# 🌍🔒 Public/Private Contests Feature

## ✨ Overview

Implemented a complete public/private contest system where:
- **Public Contests**: Visible to all users, anyone can enroll directly
- **Private Contests**: Only accessible via contest code

---

## 🔧 Implementation Details

### Backend Changes

#### 1. Contest Model (`Contest.js`)
```javascript
isPublic: {
    type: Boolean,
    default: false // Private by default
}
```

#### 2. Contest Routes (`contests.js`)

**Create Contest** - Now accepts `isPublic` field:
```javascript
POST /api/contests/create
Body: {
    name, start_time, duration, problems,
    isPublic: true/false  // NEW
}
```

**Get Public Contests** - NEW endpoint:
```javascript
GET /api/contests/public/all

Response: {
    upcoming: [...],  // Not started yet
    live: [...],      // Currently running
    past: [...]       // Already ended
}
```

**Enroll by ID** - NEW endpoint for public contests:
```javascript
POST /api/contests/enroll-by-id/:contestId
// Only works for public contests
// Returns error if contest is private
```

---

### Frontend Changes

#### 1. API Utils (`api.js`)
```javascript
export const contestAPI = {
    ...
    enrollById: (contestId) => api.post(`/contests/enroll-by-id/${contestId}`),
    getPublicContests: () => api.get('/contests/public/all'),
};
```

#### 2. CreateContest Page
Added **Public/Private Toggle**:

```
┌────────────────────────────────────────┐
│ Contest Visibility                     │
├────────────────┬───────────────────────┤
│ 🔒 Private     │ 🌍 Public             │
│                │                       │
│ Only with code │ Visible to all       │
└────────────────┴───────────────────────┘
```

**Features:**
- Two-button toggle (Private vs Public)
- Visual feedback (border highlight)
- Clear descriptions
- Default: Private

---

## 📊 How It Works

### Creating a Contest:

```
Creator fills form
    ↓
Selects: Private OR Public
    ↓
Private: 🔒
- Only code holders can join
- Not visible on public list

Public: 🌍
- Visible to everyone
- Direct "Enroll" button
- No code needed
```

### Joining Contests:

**Private Contest:**
```
User → Dashboard
    ↓
Enter Contest Code
    ↓
POST /contests/enroll/:code
    ↓
Enrolled ✓
```

**Public Contest:**
```
User → Dashboard
    ↓
See public contest list
    ↓
Click "Enroll" button
    ↓
POST /contests/enroll-by-id/:contestId
    ↓
Enrolled ✓
```

---

## 🎯 Next Steps (Dashboard Update Needed)

### Dashboard Should Show:

#### 1. **Public Contests Section** (NEW)
```
┌─────────────────────────────────┐
│ 🌍 Public Contests              │
├─────────────────────────────────┤
│ Live Now (2)                    │
│  • Weekly Challenge  [Enroll]   │
│  • Speed Round       [Enrolled] │
│                                 │
│ Upcoming (3)                    │
│  • Friday Battle    [Enroll]    │
│  • Weekend Marathon [Enroll]    │
│  • Monthly Contest  [Enroll]    │
└─────────────────────────────────┘
```

#### 2. **Your Private Contests**
```
┌─────────────────────────────────┐
│ 🔒 Your Contests                │
├─────────────────────────────────┤
│ Enrolled                        │
│  • Team Practice    [Open]      │
│                                 │
│ Created by You                  │
│  • Internal Contest [Manage]    │
└─────────────────────────────────┘
```

#### 3. **Enter Contest Code** (Existing)
```
┌─────────────────────────────────┐
│ Join Private Contest            │
│ [Enter Code...] [Join]          │
└─────────────────────────────────┘
```

---

## 💡 Features Summary

### ✅ Completed:

**Backend:**
- ✅ `isPublic` field in Contest model
- ✅ Updated create contest to accept `isPublic`
- ✅ `/api/contests/public/all` endpoint
- ✅ `/api/contests/enroll-by-id/:contestId` endpoint
- ✅ Public contests categorized (upcoming/live/past)
- ✅ Security: Can't enroll in private via ID

**Frontend:**
- ✅ Public/Private toggle in CreateContest
- ✅ Beautiful UI for visibility selection
- ✅ API methods for public contests

### 🔄 To Do:

**Dashboard Updates:**
- ⏳ Fetch and display public contests
- ⏳ Add direct "Enroll" buttons
- ⏳ Show "Live Public Contests" section
- ⏳ Show "Upcoming Public Contests" section
- ⏳ Separate private contests (by code)

---

## 🔐 Security

**Private Contests:**
- Cannot be fetched via `/public/all`
- Cannot enroll via `/enroll-by-id/...`
- Only accessible with contest code
- Returns 403 if trying to enroll by ID

**Public Contests:**
- Visible to all authenticated users
- Can enroll without code
- Shown in public list
- Still requires authentication

---

## 📝 Example Usage

### Create Public Contest:
```javascript
const contestData = {
    name: "Weekly Challenge",
    start_time: "2025-12-10T10:00:00Z",
    duration: 120,
    isPublic: true,  // ← Public
    problems: [...]
};
```

### Create Private Contest:
```javascript
const contestData = {
    name: "Team Practice",
    start_time: "2025-12-10T10:00:00Z",
    duration: 120,
    isPublic: false,  // ← Private
    problems: [...]
};
```

### Fetch Public Contests:
```javascript
const { upcoming, live, past } = await contestAPI.getPublicContests();
```

### Enroll in Public Contest:
```javascript
await contestAPI.enrollById(contestId);
```

---

## 🎨 UI Design

### CreateContest Toggle:

**Private Selected:**
```
┌──────────────────────────────────┐
│ 🔒 Private                       │ ← Blue border
│ Only users with the contest code │
│ can join                         │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ 🌍 Public                        │ ← Gray border
│ Visible to all users, anyone can│
│ join                             │
└──────────────────────────────────┘
```

**Public Selected:**
```
┌──────────────────────────────────┐
│ 🔒 Private                       │ ← Gray border
│ Only users with the contest code │
│ can join                         │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ 🌍 Public                        │ ← Blue border
│ Visible to all users, anyone can│
│ join                             │
└──────────────────────────────────┘
```

---

**Backend is 100% complete! Just need to update Dashboard to show public contests.** 🚀
