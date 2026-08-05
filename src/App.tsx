import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Summary from './pages/Summary';
import Admin from './pages/Admin';
import OnlineTestsDashboard from './pages/OnlineTests/Dashboard';
import CreateTest from './pages/OnlineTests/CreateTest';
import TakeTest from './pages/OnlineTests/TakeTest';
import TestResultView from './pages/OnlineTests/TestResultView';
import TestDetails from './pages/OnlineTests/TestDetails';
import { Toaster } from 'sonner';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/summary/:resultId" element={<Summary />} />
        <Route path="/admin" element={<Admin />} />
        
        {/* Online Tests Routes */}
        <Route path="/online-tests" element={<OnlineTestsDashboard />} />
        <Route path="/online-tests/create" element={<CreateTest />} />
        <Route path="/online-tests/details/:testId" element={<TestDetails />} />
        <Route path="/online-tests/take/:testId" element={<TakeTest />} />
        <Route path="/online-tests/results/:resultId" element={<TestResultView />} />
        
        {/* Catch-all route to prevent blank screens */}
        <Route path="*" element={<Navigate to="/online-tests" replace />} />
      </Routes>
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}

export default App;
