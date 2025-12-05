import { useState } from 'react';
import { botAPI } from '../utils/api';

const BotChat = ({ onClose }) => {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: '👋 Hey! I can analyze your LeetCode progress, roast you, or just chat. What would you like?' }
    ]);
    const [input, setInput] = useState('');
    const [mode, setMode] = useState('chat');
    const [loading, setLoading] = useState(false);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setLoading(true);

        try {
            let botReply = '';

            if (mode === 'analyze') {
                const response = await botAPI.analyze();
                botReply = response.data.analysis;
            } else if (mode === 'roast') {
                const severity = userMessage.toLowerCase().includes('savage') ? 'savage' :
                    userMessage.toLowerCase().includes('mild') ? 'mild' : 'medium';
                const response = await botAPI.roast(severity);
                botReply = response.data.roast;
            } else {
                const conversationHistory = messages.slice(1).map(msg => ({
                    role: msg.role,
                    content: msg.content
                }));
                const response = await botAPI.chat(userMessage, conversationHistory);
                botReply = response.data.reply;
            }

            setMessages(prev => [...prev, { role: 'assistant', content: botReply }]);

        } catch (error) {
            console.error('Bot error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '❌ Oops! Something went wrong. Make sure your OpenRouter API key is set up correctly.'
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAction = async (action) => {
        setLoading(true);
        setMessages(prev => [...prev, { role: 'user', content: action }]);

        try {
            let botReply = '';

            if (action === 'Analyze my progress') {
                const response = await botAPI.analyze();
                botReply = response.data.analysis;
            } else if (action === 'Roast me! 🔥') {
                const response = await botAPI.roast('savage');
                botReply = response.data.roast;
            } else if (action === 'Get suggestions') {
                const response = await botAPI.getSuggestions();
                botReply = response.data.suggestions;
            }

            setMessages(prev => [...prev, { role: 'assistant', content: botReply }]);

        } catch (error) {
            console.error('Bot error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '❌ Error: ' + (error.response?.data?.message || error.message)
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#0f2a23] rounded-xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col border border-[#10b981]/30">
                {/* Header */}
                <div className="p-4 border-b border-[#10b981]/20 flex items-center justify-between bg-gradient-to-r from-[#10b981]/10 to-[#059669]/10">
                    <div className="flex items-center gap-3">
                        <div className="text-3xl">🤖</div>
                        <div>
                            <h2 className="text-xl font-bold text-white">LeetWars AI Coach</h2>
                            <div className="flex gap-2 mt-1">
                                {['chat', 'analyze', 'roast'].map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setMode(m)}
                                        className={`px-2 py-0.5 text-xs rounded transition-all ${mode === m
                                                ? 'bg-[#10b981] text-white'
                                                : 'bg-[#0a1f1a] text-gray-400 hover:bg-[#10b981]/20'
                                            }`}
                                    >
                                        {m === 'chat' ? '💬 Chat' : m === 'analyze' ? '📊 Analyze' : '🔥 Roast'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-2xl"
                    >
                        ✕
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user'
                                        ? 'bg-[#10b981] text-white'
                                        : 'bg-[#0a1f1a] text-gray-100 border border-[#10b981]/20'
                                    } animate-fade-in`}
                            >
                                <div className="whitespace-pre-wrap">{msg.content}</div>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-[#0a1f1a] border border-[#10b981]/20 p-3 rounded-lg">
                                <div className="flex gap-2">
                                    <div className="w-2 h-2 bg-[#10b981] rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-[#10b981] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-2 h-2 bg-[#10b981] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="p-3 border-t border-[#10b981]/20 bg-[#0a1f1a]/50">
                    <div className="flex flex-wrap gap-2 mb-3">
                        <button
                            onClick={() => handleQuickAction('Analyze my progress')}
                            disabled={loading}
                            className="px-3 py-1 text-sm bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/30 rounded transition-all"
                        >
                            📊 Analyze
                        </button>
                        <button
                            onClick={() => handleQuickAction('Roast me! 🔥')}
                            disabled={loading}
                            className="px-3 py-1 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded transition-all"
                        >
                            🔥 Roast Me
                        </button>
                        <button
                            onClick={() => handleQuickAction('Get suggestions')}
                            disabled={loading}
                            className="px-3 py-1 text-sm bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30 rounded transition-all"
                        >
                            💡 Suggestions
                        </button>
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={
                                mode === 'chat' ? 'Ask me anything...' :
                                    mode === 'analyze' ? 'Ask for analysis...' :
                                        'Type "mild", "medium", or "savage"...'
                            }
                            className="input flex-1"
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="btn-primary px-6"
                        >
                            {loading ? '...' : 'Send'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default BotChat;
