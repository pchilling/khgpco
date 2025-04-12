import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import About from './pages/About';
import Projects from './pages/Projects';
import News from './pages/News';
import NewsDetail from './pages/NewsDetail';
import Events from './pages/Events';
import Footer from './components/Footer';
import './styles/App.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'antd/dist/reset.css';  // antd v5 使用 reset.css
import { LanguageProvider } from './context/LanguageContext';
import ProjectDetail from './pages/ProjectDetail';
import ContactButton from './components/ContactButton';
import EventDetail from './pages/EventDetail';

// CRM Pages
import CRMLogin from './pages/crm/auth/Login';
import SalesDashboard from './pages/crm/dashboard/SalesDashboard';
import Profile from './pages/crm/profile/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './pages/crm/admin/AdminDashboard';
import Overview from './pages/crm/admin/Overview';
import RegistrationManagement from './pages/crm/admin/RegistrationManagement';
import CustomerManagement from './pages/crm/admin/CustomerManagement';
import SalesStaffManagement from './pages/crm/admin/SalesStaffManagement';
import SalesAnalytics from './pages/crm/admin/SalesAnalytics';

// 創建一個 ScrollToTop 組件，確保每次頁面切換時滾動到頂部
function ScrollToTop() {
    const { pathname, hash } = useLocation();
    
    useEffect(() => {
        // 如果 hash 存在且為聯繫我們部分，不滾動到頂部
        if (hash && hash.includes('contact-section')) return;

        // 使用 setTimeout 確保在頁面渲染後執行滾動
        const timeoutId = setTimeout(() => {
            window.scrollTo({
                top: 0,
                behavior: 'instant'
            });
        }, 0);
        
        return () => clearTimeout(timeoutId);
    }, [pathname, hash]);
    
    return null;
}

// 主網站佈局組件
function MainLayout() {
    return (
        <>
            <Navbar />
            <ScrollToTop />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/news" element={<News />} />
                <Route path="/news/:id" element={<NewsDetail />} />
                <Route path="/events" element={<Events />} />
                <Route path="/events/:id" element={<EventDetail />} />
            </Routes>
            <Footer />
            <ContactButton />
        </>
    );
}

// 主應用組件
function App() {
    return (
        <LanguageProvider>
            <Router>
                <Routes>
                    {/* CRM 路由 */}
                    <Route path="/crm/login" element={<CRMLogin />} />
                    
                    {/* 管理員路由 */}
                    <Route 
                        path="/crm/admin/*" 
                        element={
                            <ProtectedRoute requiredRole="manager">
                                <AdminDashboard />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Navigate to="overview" replace />} />
                        <Route path="overview" element={<Overview />} />
                        <Route path="registrations" element={<RegistrationManagement />} />
                        <Route path="customers" element={<CustomerManagement />} />
                        <Route path="staff-management" element={<SalesStaffManagement />} />
                        <Route path="sales-data" element={<SalesAnalytics />} />
                    </Route>

                    {/* 銷售人員路由 */}
                    <Route 
                        path="/crm/dashboard/*" 
                        element={
                            <ProtectedRoute requiredRole="staff">
                                <SalesDashboard />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={
                            <div className="welcome-message">
                                <h1>歡迎使用銷售管理系統</h1>
                                <p>請從左側選單選擇功能</p>
                            </div>
                        } />
                        <Route path="profile" element={<Profile />} />
                    </Route>

                    {/* 主網站路由 */}
                    <Route path="/*" element={<MainLayout />} />
                </Routes>
            </Router>
        </LanguageProvider>
    );
}

export default App;
