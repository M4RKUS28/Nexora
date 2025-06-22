import { useState, useEffect } from 'react'; // Added useEffect
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { MantineProvider, ColorSchemeProvider } from '@mantine/core';
import { AuthProvider } from './contexts/AuthContext';
import { ToolbarProvider } from './contexts/ToolbarContext';
import { LanguageProvider } from './contexts/LanguageContext';
//import { NotificationProvider } from './contexts/NotificationContext';
import './i18n/i18n'; // Import i18n configuration



// Pages
import Dashboard from './pages/Dashboard';
import CreateCourse from './pages/CreateCourse';
import CourseView from './pages/CourseView';
import ChapterView from './pages/ChapterView';
import Login from './pages/Login';
import Register from './pages/Register';
import LandingPage from './pages/LandingPage';
import AppLayout from './layouts/AppLayout';
import CourseLayout from './layouts/CourseLayout';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute'; // Import AdminProtectedRoute
import SettingsPage from './pages/SettingsPage';
import StatisticsPage from './pages/StatisticsPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage'; // Import the OAuth callback page
import Impressum from './pages/Impressum';
import About from './pages/About';
import NotFoundPage from './pages/NotFoundPage'; // Import the NotFoundPage component
import AdminView from './pages/AdminView'; // Import AdminView component

function App() {
  const [colorScheme, setColorScheme] = useState(() => {
    // Load saved theme from localStorage or default to 'dark'
    return localStorage.getItem('mantine-color-scheme') || 'dark';
  });
  
  const toggleColorScheme = (value) => {
    const nextColorScheme = value || (colorScheme === 'dark' ? 'light' : 'dark');
    setColorScheme(nextColorScheme);
    // Save theme to localStorage
    localStorage.setItem('mantine-color-scheme', nextColorScheme);
  };

  // Ensure localStorage is updated when the component mounts if it wasn't set before
  useEffect(() => {
    if (!localStorage.getItem('mantine-color-scheme')) {
      localStorage.setItem('mantine-color-scheme', colorScheme);
    }
  }, [colorScheme]);
  return (
    <ColorSchemeProvider colorScheme={colorScheme} toggleColorScheme={toggleColorScheme}>
      <MantineProvider withGlobalStyles withNormalizeCSS theme={{
        colorScheme: colorScheme,
        primaryColor: 'cyan',
        components: {
          Button: {
            styles: {
              root: {
                fontWeight: 600,
              },
            },
          },
        },
      }}>
        <LanguageProvider>
          <AuthProvider>
            {/*<NotificationProvider>*/}
              <ToolbarProvider>
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                {/* Public routes with MainLayout */}
                <Route element={<MainLayout />}>
                  <Route path="/" element={<LandingPage />} /> {/* LandingPage now at root */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
                  <Route path="/impressum" element={<Impressum />} />
                  <Route path="/about" element={<About />} />
                </Route>
                  {/* Protected routes now based at /dashboard */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<AppLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="create-course" element={<CreateCourse />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="statistics" element={<StatisticsPage />} />
                  </Route>
                  <Route path="/dashboard/courses/:courseId" element={<CourseLayout />}>
                    <Route index element={<CourseView />} />
                    <Route path="chapters/:chapterId" element={<ChapterView />} />
                  </Route>
                </Route>
                  {/* Admin-only routes - Using AppLayout for consistent interface */}
                <Route element={<AdminProtectedRoute />}>
                  <Route path="/admin" element={<AppLayout />}>
                    <Route index element={<AdminView />} />
                    {/* Add other admin routes here */}
                  </Route>
                </Route>

                {/* Old redirects removed as new routing handles root and protected areas explicitly */}
                <Route path="*" element={<NotFoundPage />} /> {/* Catch-all route for 404 */}
              </Routes>          </BrowserRouter>
            <ToastContainer position="top-right" autoClose={3000} theme={colorScheme} />
              </ToolbarProvider>
            {/*</NotificationProvider>*/}
          </AuthProvider>
        </LanguageProvider>
      </MantineProvider>
    </ColorSchemeProvider>
  );
}

export default App;