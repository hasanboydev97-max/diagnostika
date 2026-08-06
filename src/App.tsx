import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, Suspense, lazy } from 'react';
import CustomCursor from './components/CustomCursor';
import InitialLoader from './components/InitialLoader';
import { Toaster } from 'sonner';

// Code Splitting for routes
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Summary = lazy(() => import('./pages/Summary'));
const Admin = lazy(() => import('./pages/Admin'));
const SuperAdmin = lazy(() => import('./pages/SuperAdmin'));
const OnlineTestsDashboard = lazy(() => import('./pages/OnlineTests/Dashboard'));
const CreateTest = lazy(() => import('./pages/OnlineTests/CreateTest'));
const TakeTest = lazy(() => import('./pages/OnlineTests/TakeTest'));
const TestResultView = lazy(() => import('./pages/OnlineTests/TestResultView'));
const TestDetails = lazy(() => import('./pages/OnlineTests/TestDetails'));
const TeacherAuth = lazy(() => import('./pages/OnlineTests/TeacherAuth'));

const RouteLoader = () => (
  <div className="min-h-screen bg-[#fdfdfd] flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
  </div>
);

function App() {
  const [appReady, setAppReady] = useState(false);

  return (
    <BrowserRouter>
      <CustomCursor />
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/summary/:resultId" element={<Summary />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/superadmin" element={<SuperAdmin />} />
          
          {/* Teacher Auth */}
          <Route path="/teacher/login" element={<TeacherAuth />} />
          
          {/* Online Tests Routes */}
          <Route path="/online-tests" element={<OnlineTestsDashboard />} />
          <Route path="/online-tests/create" element={<CreateTest />} />
          <Route path="/online-tests/details/:testId" element={<TestDetails />} />
          <Route path="/online-tests/take/:testId" element={<TakeTest />} />
          <Route path="/online-tests/results/:resultId" element={<TestResultView />} />
          
          {/* Catch-all route to prevent blank screens */}
          <Route path="*" element={<Navigate to="/online-tests" replace />} />
        </Routes>
      </Suspense>
      <InitialLoader onComplete={() => setAppReady(true)} />
      {appReady && <Toaster position="top-right" richColors />}
    </BrowserRouter>
  );
}

export default App;
