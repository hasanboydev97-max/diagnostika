import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, Suspense, lazy } from 'react';
import CustomCursor from './components/CustomCursor';
import InitialLoader from './components/InitialLoader';
import { Toaster } from 'sonner';
import ErrorBoundary from './components/ErrorBoundary';

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
const LiveHost = lazy(() => import('./pages/OnlineTests/LiveHost'));
const LivePlayer = lazy(() => import('./pages/OnlineTests/LivePlayer'));
const DuelPlayer = lazy(() => import('./pages/OnlineTests/DuelPlayer'));
const GamesList = lazy(() => import('./pages/Games/GamesList'));
const MathNinja = lazy(() => import('./pages/Games/MathNinja'));
const EnglishWords = lazy(() => import('./pages/Games/EnglishWords'));
const RussianWords = lazy(() => import('./pages/Games/RussianWords'));
const FormulaChain = lazy(() => import('./pages/Games/FormulaChain'));
const MistakeInspector = lazy(() => import('./pages/Games/MistakeInspector'));
const MatchMaster = lazy(() => import('./pages/Games/MatchMaster'));
const WordBlast = lazy(() => import('./pages/Games/WordBlast'));
const GlobalTrivia = lazy(() => import('./pages/Games/GlobalTrivia'));
const ChessPuzzle = lazy(() => import('./pages/Games/ChessPuzzle'));

// OMR Routes
const OMRGenerator = lazy(() => import('./pages/Admin/OMRGenerator'));
const OMRScanner = lazy(() => import('./pages/Admin/OMRScanner'));

import PwaInstallPrompt from './components/PwaInstallPrompt';

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
      <PwaInstallPrompt />
      <ErrorBoundary>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/summary/:resultId" element={<Summary />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/superadmin" element={<SuperAdmin />} />
            <Route path="/admin/omr-generator" element={<OMRGenerator />} />
            <Route path="/admin/omr-scanner" element={<OMRScanner />} />
            
            {/* Teacher Auth */}
            <Route path="/teacher/login" element={<TeacherAuth />} />
            
            {/* Online Tests Routes */}
            <Route path="/online-tests" element={<OnlineTestsDashboard />} />
            <Route path="/online-tests/create" element={<CreateTest />} />
            <Route path="/online-tests/details/:testId" element={<TestDetails />} />
            <Route path="/online-tests/take/:testId" element={<TakeTest />} />
            <Route path="/online-tests/results/:resultId" element={<TestResultView />} />
            <Route path="/online-tests/live/host/:testId" element={<LiveHost />} />
            <Route path="/live" element={<LivePlayer />} />
            <Route path="/duel" element={<DuelPlayer />} />
            
            {/* Games Module */}
            <Route path="/games" element={<GamesList />} />
            <Route path="/games/math-ninja" element={<MathNinja />} />
            <Route path="/games/english-words" element={<EnglishWords />} />
            <Route path="/games/russian-words" element={<RussianWords />} />
            <Route path="/games/formula-chain" element={<FormulaChain />} />
            <Route path="/games/mistake-inspector" element={<MistakeInspector />} />
            <Route path="/games/match-master" element={<MatchMaster />} />
            <Route path="/games/word-blast" element={<WordBlast />} />
            <Route path="/games/global-trivia" element={<GlobalTrivia />} />
            <Route path="/games/chess-puzzle" element={<ChessPuzzle />} />
            
            {/* Catch-all route to prevent blank screens */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <InitialLoader onComplete={() => setAppReady(true)} />
      {appReady && <Toaster position="top-right" richColors />}
    </BrowserRouter>
  );
}

export default App;
