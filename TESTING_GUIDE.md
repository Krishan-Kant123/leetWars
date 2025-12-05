# 🧪 Testing LeetCode API Search - Step by Step

## Prerequisites
Make sure both servers are running:
```bash
# Terminal 1 - Backend
cd server
npm start

# Terminal 2 - Frontend  
cd client
npm run dev
```

## How to Test

### Test 1: Search for a Problem NOT in Seed Data

1. **Open the app**: http://localhost:3000
2. **Login** with your account
3. **Go to**: "Create Contest"
4. **Search for**: `"median of two sorted arrays"`
5. **Watch the server console** (Terminal 1) - you should see:
   ```
   🔍 Problem Search Request:
      Query: median of two sorted arrays
      ...
      📊 Found 0 problems in local database
      🌐 No local results, searching LeetCode API...
      🔧 Building LeetCode API query...
      📡 Calling LeetCode API...
      📨 API Response received
      ✅ Parsed X questions from API
      🔄 Transformed X problems
      ✅ LeetCode API returned X problems
      💾 Caching X problems to database...
   ```

6. **Expected Result**: Problem should appear in search results
7. **Source**: Check the response - should say `"source": "leetcode"`

### Test 2: Verify Caching Works

1. **Search again** for the same problem: `"median of two sorted arrays"`
2. **Watch server console** - this time you should see:
   ```
   🔍 Problem Search Request:
      Query: median of two sorted arrays
      📊 Found 1 problems in local database
      📤 Returning 1 problems
   ```
3. **Expected Result**: Same problem, but now from database (faster!)
4. **Source**: Should say `"source": "database"`

### Test 3: Tag Filtering

1. **Click tags**: Select "Dynamic Programming" + "Array"
2. **Click**: "Search" button
3. **Watch server console**:
   ```
   🔍 Problem Search Request:
      Tags: Dynamic Programming,Array
      📊 Found 0 problems in local database  
      🌐 No local results, searching LeetCode API...
      🔧 Building LeetCode API query...
         Tags: [ 'Dynamic Programming', 'Array' ]
      📡 Calling LeetCode API...
   ```
4. **Expected Result**: Problems with BOTH tags should appear

### Test 4: Difficulty Filter

1. **Select difficulty**: "Medium"
2. **Click**: "Search"
3. **Watch server console**:
   ```
   🔍 Problem Search Request:
      Difficulty: Medium
      🌐 No local results, searching LeetCode API...
      🔧 Building LeetCode API query...
         Difficulty: Medium
      📡 Calling LeetCode API...
   ```
4. **Expected Result**: Only Medium difficulty problems

### Test 5: Combined Filters

1. **Search**: `"tree"`
2. **Difficulty**: "Easy"  
3. **Tags**: "Tree" + "Depth-First Search"
4. **Click**: "Search"
5. **Expected Result**: Easy tree problems with DFS tag

## Troubleshooting

### Problem: No results from LeetCode API

**Check server console for errors:**
- If you see `❌ API returned errors:` - The query structure is wrong
- If you see `❌ searchProblemsOnLeetCode error:` - Network issue or rate limit

**Solution:**
1. Wait 30 seconds (rate limit)
2. Check internet connection
3. Try simpler search (difficulty only)

### Problem: Caching not working

**Symptoms:**
- Always says `source: "leetcode"` even on repeat search
- Server console shows LeetCode API called every time

**Check:**
1. Is MongoDB running? (`mongod` or MongoDB Compass)
2. Check `.env` - `MONGODB_URI` correct?
3. Server console - any `❌ Error caching problems` messages?

### Problem: Tags not working

**Symptoms:**
- Selecting tags but getting all problems

**Check:**
1. Are tags selected (blue color)?
2. Server console - does `Tags:` show your selections?
3. Frontend - check browser console for errors

## Expected Server Log Example

```bash
🔍 Problem Search Request:
   Query: two sum
   Difficulty: Easy
   Tags: Array,Hash Table
   DB Filter: {"$or":[{"title":{"$regex":"two sum","$options":"i"}},{"title_slug":{"$regex":"two sum","$options":"i"}}],"difficulty":"Easy","tags":{"$in":["Array","Hash Table"]}}
   📊 Found 0 problems in local database
   🌐 No local results, searching LeetCode API...
      🔧 Building LeetCode API query...
         Difficulty: Easy
         Tags: [ 'Array', 'Hash Table' ]
         Keywords: two sum
      📋 API Filters: {"difficulty":"EASY","tags":["Array","Hash Table"],"searchKeywords":"two sum"}
      📡 Calling LeetCode API...
      📨 API Response received
      ✅ Parsed 5 questions from API
      🔄 Transformed 5 problems
   ✅ LeetCode API returned 5 problems
   💾 Caching 5 problems to database...
   📤 Returning 5 problems

   ✅ Successfully cached 5 problems
```

## Success Criteria

✅ **API Fallback Working** when:
- Local DB has 0 results
- LeetCode API is called
- Problems are returned

✅ **Caching Working** when:
- First search: `source: "leetcode"`
- Second search (same query): `source: "database"`
- Server shows "Successfully cached X problems"

✅ **Tag Filtering Working** when:
- Selected tags appear in server logs
- Results match selected tags
- Can combine with difficulty

## FAQs

**Q: Why am I still seeing only seeded problems?**  
A: The search might be finding results in local DB. Try a very specific problem name not in seed data (e.g., "median of two sorted arrays", "longest common subsequence", etc.)

**Q: How do I know if LeetCode API was called?**  
A: Watch server console - you'll see "🌐 No local results, searching LeetCode API..." message

**Q: Does it cache automatically?**  
A: Yes! After API call, problems are saved to DB in background. Next search will be instant from DB.

**Q: Can I force LeetCode API search?**  
A: Yes - either:
  1. Search for unique problem name
  2. Clear your database (`db.problems.deleteMany({})` in Mongo)
  3. Use very specific tag combinations

**Q: What if LeetCode blocks the API?**  
A: We use browser-like headers to avoid blocking. If it happens:
  1. Wait 1-2 minutes
  2. Try again
  3. The cached problems will still work!
