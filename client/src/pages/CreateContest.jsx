import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { contestAPI, problemsAPI } from '../utils/api';
import { toast } from 'sonner';

const POPULAR_TAGS = [
    'Array', 'String', 'Hash Table', 'Dynamic Programming', 'Math',
    'Sorting', 'Greedy', 'Depth-First Search', 'Binary Search',
    'Breadth-First Search', 'Tree', 'Two Pointers', 'Stack', 'Graph'
];

const CreateContest = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [startTime, setStartTime] = useState('');
    const [duration, setDuration] = useState(90);
    const [isPublic, setIsPublic] = useState(false);
    const [selectedProblems, setSelectedProblems] = useState([]);

    // Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [difficulty, setDifficulty] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [creating, setCreating] = useState(false);
    const [initialLoad, setInitialLoad] = useState(false);

    // Get minimum datetime (current time + 5 minutes)
    const getMinDateTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 5); // Add 5 minutes buffer
        return now.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
    };

    const observer = useRef();
    const lastProblemRef = useCallback(node => {
        if (searching) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [searching, hasMore]);

    // Auto-fetch problems on initial load
    useEffect(() => {
        if (!initialLoad) {
            handleSearch(true);
            setInitialLoad(true);
        }
    }, []);

    // Fetch more when page changes
    useEffect(() => {
        if (page > 1) {
            handleSearch(false);
        }
    }, [page]);

    const handleSearch = async (newSearch = false) => {
        const currentPage = newSearch ? 1 : page;
        if (newSearch) {
            setSearchResults([]);
            setPage(1);
        }

        setSearching(true);
        try {
            const params = {
                page: currentPage,
                limit: 20
            };

            if (searchQuery.trim()) params.query = searchQuery.trim();
            if (difficulty) params.difficulty = difficulty;
            if (selectedTags.length > 0) params.tags = selectedTags.join(',');

            console.log('🔍 Searching with params:', params);

            const response = await problemsAPI.search(params);
            const newProblems = response.data.problems || [];

            setSearchResults(prev => newSearch ? newProblems : [...prev, ...newProblems]);
            setHasMore(response.data.pagination?.hasMore || false);

            console.log(`✅ Found ${newProblems.length} problems (Page ${currentPage})`);
        } catch (error) {
            console.error('Search error:', error);
            toast.error('Failed to search problems', {
                description: 'Please try again later'
            });
        } finally {
            setSearching(false);
        }
    };

    const toggleTag = (tag) => {
        setSelectedTags(prev => {
            const newTags = prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag];
            return newTags;
        });
    };

    const handleDifficultyChange = (diff) => {
        setDifficulty(diff);
        // Auto-search when difficulty changes
        setTimeout(() => handleSearch(true), 100);
    };

    const handleTagSearch = () => {
        handleSearch(true);
    };

    const addProblem = (problem) => {
        // Use _id (MongoDB ObjectId) not questionId (LeetCode number string)
        const problemObjectId = problem._id || problem.problem_id;

        if (selectedProblems.some(p => p.problem_id === problemObjectId)) {
            alert('Problem already added!');
            return;
        }
        if (selectedProblems.length >= 100) {
            alert('Maximum 100 problems allowed!');
            return;
        }

        const problemData = {
            problem_id: problemObjectId, // Use MongoDB _id, NOT questionId
        slug: problem.title_slug || problem.slug,
            title: problem.title,
                difficulty: problem.difficulty,
                    tags: problem.tags || [],
                        points: problem.difficulty === 'Easy' ? 1 : problem.difficulty === 'Medium' ? 2 : 3
    };

    setSelectedProblems([...selectedProblems, problemData]);
};

const removeProblem = (problem_id) => {
    setSelectedProblems(selectedProblems.filter(p => p.problem_id !== problem_id));
};

const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !startTime || !duration || selectedProblems.length === 0) {
        toast.error('Missing fields', {
            description: 'Please fill in all fields and select at least one problem'
        });
        return;
    }

    // Validate duration
    const durationNum = parseInt(duration);
    if (durationNum < 20 || durationNum > 180) {
        toast.error('Invalid duration', {
            description: 'Contest duration must be between 20 and 180 minutes (3 hours)'
        });
        return;
    }

    setCreating(true);

    try {
        const contestData = {
            name: name.trim(),
            start_time: new Date(startTime).toISOString(),
            duration: parseInt(duration),
            problems: selectedProblems,
            isPublic
        };

        const response = await contestAPI.create(contestData);
        toast.success('Contest created successfully! 🎉', {
            description: `Contest Code: ${response.data.contest.unique_code}`
        });
        navigate('/dashboard');
    } catch (error) {
        console.error('Create contest error:', error);
        toast.error('Failed to create contest', {
            description: error.response?.data?.message || 'Please try again later'
        });
    } finally {
        setCreating(false);
    }
};

return (
    <div className="min-h-screen py-12 px-4">
        <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl font-bold mb-2 gradient-text">Create New Contest</h1>
            <p className="text-gray-400 mb-8">Configure details and select up to 100 problems</p>

            <div className="grid lg:grid-cols-[400px_1fr] gap-8">
                {/* Left: Contest Settings & Selected Problems */}
                <div>
                    {/* Contest Settings */}
                    <div className="card p-6 mb-6">
                        <h2 className="text-2xl font-bold mb-6 text-white">Contest Settings</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Contest Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Weekend Warm-up"
                                    className="input"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Start Date & Time (Your Local Time)
                                </label>
                                <input
                                    type="datetime-local"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    min={getMinDateTime()}
                                    className="input"
                                    required
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Contest will start at this time in your timezone. Times are automatically converted to UTC.
                                </p>
                            </div>


                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Duration (minutes)
                                </label>
                                <input
                                    type="number"
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    placeholder="e.g., 90"
                                    min="20"
                                    max="180"
                                    className="input"
                                    required
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Contest duration must be between 20 and 180 minutes (3 hours)
                                </p>
                            </div>

                            {/* Public/Private Toggle */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-3">
                                    Visibility
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsPublic(false)}
                                        className={`p-3 rounded-lg border-2 transition-all ${!isPublic
                                            ? 'border-[#10b981] bg-[#10b981]/10'
                                            : 'border-gray-600 hover:border-gray-500'
                                            }`}
                                    >
                                        <div className="text-xl mb-1">🔒</div>
                                        <div className="font-semibold text-white text-sm">Private</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsPublic(true)}
                                        className={`p-3 rounded-lg border-2 transition-all ${isPublic
                                            ? 'border-[#10b981] bg-[#10b981]/10'
                                            : 'border-gray-600 hover:border-gray-500'
                                            }`}
                                    >
                                        <div className="text-xl mb-1">🌍</div>
                                        <div className="font-semibold text-white text-sm">Public</div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Selected Problems */}
                    <div className="card p-6 sticky top-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">Selected</h2>
                            <span className="text-sm px-3 py-1 bg-[#10b981]/20 text-[#10b981] rounded-full border border-[#10b981]/30">
                                {selectedProblems.length}/100
                            </span>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto space-y-2">
                            {selectedProblems.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center py-4">No problems selected</p>
                            ) : (
                                selectedProblems.map((problem) => (
                                    <div
                                        key={problem.problem_id}
                                        className="p-3 bg-[#0a1f1a] rounded-lg border border-[#10b981]/20 group hover:border-[#10b981]/40 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-white text-sm truncate">{problem.title}</div>
                                                <div className="flex gap-1 mt-1 flex-wrap">
                                                    <span className={`badge badge-${problem.difficulty.toLowerCase()} text-xs`}>
                                                        {problem.difficulty}
                                                    </span>
                                                    {problem.tags?.slice(0, 2).map(tag => (
                                                        <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeProblem(problem.problem_id)}
                                                className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Create Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={creating || selectedProblems.length === 0}
                            className="btn-primary w-full mt-4"
                        >
                            {creating ? 'Creating...' : `✓ Create Contest (${selectedProblems.length})`}
                        </button>
                    </div>
                </div>

                {/* Right: Problem Search */}
                <div>
                    <div className="card p-6">
                        <h2 className="text-2xl font-bold mb-6 text-white">Search Problems</h2>

                        {/* Search Controls */}
                        <div className="space-y-4 mb-6">
                            {/* Search Input */}
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch(true)}
                                    placeholder="Search by name or ID..."
                                    className="input flex-1"
                                />
                                <button
                                    onClick={() => handleSearch(true)}
                                    disabled={searching}
                                    className="btn-primary px-6"
                                >
                                    {searching ? '...' : 'Search'}
                                </button>
                            </div>

                            {/* Difficulty Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleDifficultyChange('')}
                                        className={`px-4 py-2 rounded-lg border transition-all ${difficulty === ''
                                            ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]'
                                            : 'border-gray-600 text-gray-400 hover:border-gray-500'
                                            }`}
                                    >
                                        All
                                    </button>
                                    <button
                                        onClick={() => handleDifficultyChange('Easy')}
                                        className={`px-4 py-2 rounded-lg border transition-all ${difficulty === 'Easy'
                                            ? 'border-green-500 bg-green-500/10 text-green-400'
                                            : 'border-gray-600 text-gray-400 hover:border-gray-500'
                                            }`}
                                    >
                                        Easy
                                    </button>
                                    <button
                                        onClick={() => handleDifficultyChange('Medium')}
                                        className={`px-4 py-2 rounded-lg border transition-all ${difficulty === 'Medium'
                                            ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                                            : 'border-gray-600 text-gray-400 hover:border-gray-500'
                                            }`}
                                    >
                                        Medium
                                    </button>
                                    <button
                                        onClick={() => handleDifficultyChange('Hard')}
                                        className={`px-4 py-2 rounded-lg border transition-all ${difficulty === 'Hard'
                                            ? 'border-red-500 bg-red-500/10 text-red-400'
                                            : 'border-gray-600 text-gray-400 hover:border-gray-500'
                                            }`}
                                    >
                                        Hard
                                    </button>
                                </div>
                            </div>

                            {/* Tag Filter */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-gray-300">Tags</label>
                                    {selectedTags.length > 0 && (
                                        <button
                                            onClick={() => setSelectedTags([])}
                                            className="text-xs text-gray-400 hover:text-[#10b981]"
                                        >
                                            Clear all
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2 p-3 bg-[#0a1f1a] rounded-lg border border-gray-600 max-h-32 overflow-y-auto">
                                    {POPULAR_TAGS.map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => toggleTag(tag)}
                                            className={`px-3 py-1 rounded-lg text-sm transition-all ${selectedTags.includes(tag)
                                                ? 'bg-[#10b981] text-white'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                }`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                                {selectedTags.length > 0 && (
                                    <button
                                        onClick={handleTagSearch}
                                        className="btn-primary w-full mt-2"
                                    >
                                        Apply Tag Filter ({selectedTags.length})
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Results */}
                        <div className="space-y-3 max-h-[700px] overflow-y-auto">
                            {searchResults.length === 0 && !searching ? (
                                <div className="text-center py-12">
                                    <div className="text-5xl mb-4">🔍</div>
                                    <p className="text-gray-400">
                                        {initialLoad ? 'No problems found. Try adjusting filters.' : 'Loading problems...'}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {searchResults.map((problem, index) => {
                                        const isLast = index === searchResults.length - 1;
                                        const problemObjectId = problem._id || problem.problem_id;
                                        const isAdded = selectedProblems.some(p => p.problem_id === problemObjectId);

                                        return (
                                            <div
                                                key={problemObjectId || index}
                                                ref={isLast ? lastProblemRef : null}
                                                className="p-4 bg-[#0a1f1a] rounded-lg border border-gray-600 hover:border-[#10b981]/30 transition-colors"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <h3 className="font-medium text-white mb-2">{problem.title}</h3>
                                                        <div className="flex gap-2 flex-wrap">
                                                            <span className={`badge badge-${problem.difficulty.toLowerCase()}`}>
                                                                {problem.difficulty}
                                                            </span>
                                                            {problem.tags && problem.tags.slice(0, 3).map(tag => (
                                                                <span key={tag} className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                            {problem.tags && problem.tags.length > 3 && (
                                                                <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-400">
                                                                    +{problem.tags.length - 3}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => addProblem(problem)}
                                                        disabled={isAdded}
                                                        className={`px-4 py-2 rounded-lg transition-all ${isAdded
                                                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                                            : 'bg-[#10b981] hover:bg-[#059669] text-white'
                                                            }`}
                                                    >
                                                        {isAdded ? '✓ Added' : '+ Add'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {searching && (
                                        <div className="text-center py-4">
                                            <div className="spinner mx-auto"></div>
                                            <p className="text-gray-400 mt-2 text-sm">Loading more...</p>
                                        </div>
                                    )}
                                    {!hasMore && searchResults.length > 0 && (
                                        <div className="text-center py-4 text-gray-500 text-sm">
                                            No more problems to load
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
};

export default CreateContest;
