import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Recommend from './components/Recommend'; 
import Dashboard from './components/Dashboard'; // 1. Import the new component
import { logEnv } from './config';

function App() {
  useEffect(() => {
    logEnv();
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/recommend" element={<Recommend />} />
          
          {/* 2. Add this new route */}
          <Route path="/dashboard" element={<Dashboard />} /> 
        </Routes>
      </div>
    </Router>
  );
}

export default App; 