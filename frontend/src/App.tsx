import React, { useState, useEffect } from 'react';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { LandingPage } from './pages/LandingPage';
import { StatusReceiptPage } from './pages/StatusReceiptPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

export function App() {
  const [currentTab, setCurrentTab] = useState<'student' | 'lookup' | 'admin'>('student');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem('uhv_admin_token');
    setIsAdminLoggedIn(Boolean(token));
  }, [currentTab]);

  const handleAdminLogout = () => {
    localStorage.removeItem('uhv_admin_token');
    localStorage.removeItem('uhv_admin_name');
    setIsAdminLoggedIn(false);
    setCurrentTab('student');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Header currentTab={currentTab} onTabChange={setCurrentTab} />

      <main className="flex-1">
        {currentTab === 'student' && <LandingPage />}
        {currentTab === 'lookup' && <StatusReceiptPage />}
        {currentTab === 'admin' && (
          isAdminLoggedIn ? (
            <AdminDashboardPage onLogout={handleAdminLogout} />
          ) : (
            <AdminLoginPage onLoginSuccess={() => setIsAdminLoggedIn(true)} />
          )
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
