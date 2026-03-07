import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Triage from './components/Triage';
import Options from './components/Options';
import Lab from './components/Lab';
import DailyDashboard from './components/DailyDashboard';
import PlanSummary from './components/PlanSummary';
import MyPlans from './components/MyPlans';
import ManageFarms from './components/ManageFarms';
import FarmDetails from './components/FarmDetails';
import { logEnv } from './config';

function App() {
  useEffect(() => {
    logEnv();
  }, []);

  return (
    <Router>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content-area">
          <Routes>
            <Route path="/" element={<DailyDashboard />} />
            <Route path="/triage" element={<Triage />} />
            <Route path="/options" element={<Options />} />
            <Route path="/lab" element={<Lab />} />
            <Route path="/plan-summary" element={<PlanSummary />} />
            <Route path="/my-plans" element={<MyPlans />} />
            <Route path="/farms" element={<ManageFarms />} />
            <Route path="/farms/:id" element={<FarmDetails />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;