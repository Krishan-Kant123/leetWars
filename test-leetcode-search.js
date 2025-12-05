const axios = require('axios');

const LEETCODE_API_ENDPOINT = 'https://leetcode.com/graphql';

// Test the problemset query
const PROBLEMSET_QUERY = `
  query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
    problemsetQuestionList: questionList(
      categorySlug: $categorySlug
      limit: $limit
      skip: $skip
      filters: $filters
    ) {
      total: totalNum
      questions: data {
        questionId
        title
        titleSlug
        difficulty
        topicTags {
          name
        }
      }
    }
  }
`;

const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://leetcode.com/'
};

async function testSearch() {
    console.log('🧪 Testing LeetCode Problem Search API...\n');

    // Test 1: Search with difficulty filter
    console.log('Test 1: Search Medium difficulty problems');
    try {
        const response = await axios.post(LEETCODE_API_ENDPOINT, {
            query: PROBLEMSET_QUERY,
            variables: {
                categorySlug: "",
                limit: 5,
                skip: 0,
                filters: {
                    difficulty: "MEDIUM"
                }
            }
        }, { headers });

        if (response.data.errors) {
            console.error('❌ Error:', JSON.stringify(response.data.errors, null, 2));
        } else {
            const questions = response.data.data.problemsetQuestionList.questions;
            console.log(`✅ Success! Found ${questions.length} problems`);
            console.log('Sample:', questions[0]);
        }
    } catch (error) {
        console.error('❌ Request failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }

    // Test 2: Search with tags
    console.log('\n\nTest 2: Search Array + Dynamic Programming');
    try {
        const response = await axios.post(LEETCODE_API_ENDPOINT, {
            query: PROBLEMSET_QUERY,
            variables: {
                categorySlug: "",
                limit: 5,
                skip: 0,
                filters: {
                    tags: ["array", "dynamic-programming"]
                }
            }
        }, { headers });

        if (response.data.errors) {
            console.error('❌ Error:', JSON.stringify(response.data.errors, null, 2));
        } else {
            const questions = response.data.data.problemsetQuestionList.questions;
            console.log(`✅ Success! Found ${questions.length} problems`);
            if (questions.length > 0) {
                console.log('Sample:', questions[0]);
            }
        }
    } catch (error) {
        console.error('❌ Request failed:', error.message);
    }

    // Test 3: Search with keyword
    console.log('\n\nTest 3: Search with keyword "subarray"');
    try {
        const response = await axios.post(LEETCODE_API_ENDPOINT, {
            query: PROBLEMSET_QUERY,
            variables: {
                categorySlug: "",
                limit: 5,
                skip: 0,
                filters: {
                    searchKeywords: "subarray"
                }
            }
        }, { headers });

        if (response.data.errors) {
            console.error('❌ Error:', JSON.stringify(response.data.errors, null, 2));
        } else {
            const questions = response.data.data.problemsetQuestionList.questions;
            console.log(`✅ Success! Found ${questions.length} problems`);
            if (questions.length > 0) {
                console.log('Sample:', questions[0]);
            }
        }
    } catch (error) {
        console.error('❌ Request failed:', error.message);
    }
}

testSearch();
