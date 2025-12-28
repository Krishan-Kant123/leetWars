const mongoose = require('mongoose');
require('dotenv').config();
const Problem = require('./models/Problem');

// Sample LeetCode problems
const sampleProblems = [
    {
        title: "Two Sum",
        title_slug: "two-sum",
        difficulty: "Easy",
        tags: ["Array", "Hash Table"],
        questionId: "1"
    },
    {
        title: "Add Two Numbers",
        title_slug: "add-two-numbers",
        difficulty: "Medium",
        tags: ["Linked List", "Math", "Recursion"],
        questionId: "2"
    },
    {
        title: "Longest Substring Without Repeating Characters",
        title_slug: "longest-substring-without-repeating-characters",
        difficulty: "Medium",
        tags: ["Hash Table", "String", "Sliding Window"],
        questionId: "3"
    },
    {
        title: "Median of Two Sorted Arrays",
        title_slug: "median-of-two-sorted-arrays",
        difficulty: "Hard",
        tags: ["Array", "Binary Search", "Divide and Conquer"],
        questionId: "4"
    },
    {
        title: "Reverse Integer",
        title_slug: "reverse-integer",
        difficulty: "Easy",
        tags: ["Math"],
        questionId: "7"
    },
    {
        title: "Valid Parentheses",
        title_slug: "valid-parentheses",
        difficulty: "Easy",
        tags: ["String", "Stack"],
        questionId: "20"
    },
    {
        title: "Merge Two Sorted Lists",
        title_slug: "merge-two-sorted-lists",
        difficulty: "Easy",
        tags: ["Linked List", "Recursion"],
        questionId: "21"
    },
    {
        title: "Maximum Subarray",
        title_slug: "maximum-subarray",
        difficulty: "Easy",
        tags: ["Array", "Divide and Conquer", "Dynamic Programming"],
        questionId: "53"
    },
    {
        title: "Climbing Stairs",
        title_slug: "climbing-stairs",
        difficulty: "Easy",
        tags: ["Math", "Dynamic Programming", "Memoization"],
        questionId: "70"
    },
    {
        title: "Binary Tree Inorder Traversal",
        title_slug: "binary-tree-inorder-traversal",
        difficulty: "Easy",
        tags: ["Stack", "Tree", "Depth-First Search"],
        questionId: "94"
    },
    {
        title: "Best Time to Buy and Sell Stock",
        title_slug: "best-time-to-buy-and-sell-stock",
        difficulty: "Easy",
        tags: ["Array", "Dynamic Programming"],
        questionId: "121"
    },
    {
        title: "Longest Palindromic Substring",
        title_slug: "longest-palindromic-substring",
        difficulty: "Medium",
        tags: ["String", "Dynamic Programming"],
        questionId: "5"
    },
    {
        title: "3Sum",
        title_slug: "3sum",
        difficulty: "Medium",
        tags: ["Array", "Two Pointers", "Sorting"],
        questionId: "15"
    },
    {
        title: "Container With Most Water",
        title_slug: "container-with-most-water",
        difficulty: "Medium",
        tags: ["Array", "Two Pointers", "Greedy"],
        questionId: "11"
    },
    {
        title: "Merge Intervals",
        title_slug: "merge-intervals",
        difficulty: "Medium",
        tags: ["Array", "Sorting"],
        questionId: "56"
    }
];

async function seedProblems() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);


        console.log('✅ Connected to MongoDB');

        // Clear existing problems
        await Problem.deleteMany({});
        console.log('🗑️  Cleared existing problems');

        // Insert sample problems
        await Problem.insertMany(sampleProblems);
        console.log(`✅ Inserted ${sampleProblems.length} sample problems`);

        mongoose.connection.close();
        console.log('✅ Database seeding completed!');

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
}

seedProblems();
