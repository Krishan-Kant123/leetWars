import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'sonner';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateContest from './pages/CreateContest';
import ContestLobby from './pages/ContestLobby';
import ContestArena from './pages/ContestArena';
import Profile from './pages/Profile';
import Navbar from './components/Navbar';
import './styles/battle-animations.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return isAuthenticated ? children : <Navigate to="/login" />;
};

// App Routes Component
const AppRoutes = () => {
    const { isAuthenticated } = useAuth();

    return (
        <>
            {isAuthenticated && <Navbar />}
            <Routes>
                <Route
                    path="/login"
                    element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />}
                />
                <Route
                    path="/register"
                    element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />}
                />
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/contest/create"
                    element={
                        <ProtectedRoute>
                            <CreateContest />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/contest/:code"
                    element={
                        <ProtectedRoute>
                            <ContestLobby />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/contest/:code/arena"
                    element={
                        <ProtectedRoute>
                            <ContestArena />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <Profile />
                        </ProtectedRoute>
                    }
                />
                <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
        </>
    );
};

function App() {
    return (
        <Router>
            <AuthProvider>
                <Toaster position="top-right" theme="dark" richColors />
                <AppRoutes />
            </AuthProvider>
        </Router>
    );
}

export default App;
