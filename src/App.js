import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
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
import SalesDashboard from './pages/crm/sales/SalesDashboard';
import Profile from './pages/crm/profile/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './pages/crm/admin/AdminDashboard';
import Overview from './pages/crm/admin/Overview';
import RegistrationManagement from './pages/crm/admin/RegistrationManagement';
import CustomerManagement from './pages/crm/admin/CustomerManagement';
import SalesStaffManagement from './pages/crm/admin/SalesStaffManagement';
import SalesAnalytics from './pages/crm/admin/SalesAnalytics';
import MyCustomers from './pages/crm/sales/MyCustomers';
import InteractionManagement from './pages/crm/admin/InteractionManagement';
import ContactMessages from './pages/crm/admin/ContactMessages';
import PerformanceDashboard from './pages/crm/admin/PerformanceDashboard';

// 添加互動記錄組件的引入
import Interactions from './pages/crm/sales/Interactions';
import SalesOverview from './pages/crm/sales/SalesOverview';
import SalesRegistrationManagement from './pages/crm/sales/RegistrationManagement';

// 創建一個 ScrollToTop 組件，確保每次頁面切換時滾動到頂部
function ScrollToTop() {
    const { pathname, hash } = useLocation();
    
    useEffect(() => {
        console.log('ScrollToTop: pathname changed to', pathname, 'hash:', hash);
        
        // 如果 hash 存在且為聯繫我們部分，不滾動到頂部
        if (hash && hash.includes('contact-section')) {
            console.log('ScrollToTop: Skipping scroll due to contact-section hash');
            return;
        }

        // 強制滾動到頂部的函數
        const scrollToTop = () => {
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'instant'
            });
        };

        // 立即滾動到頂部
        console.log('ScrollToTop: Immediate scroll');
        scrollToTop();
        
        // 多重保險機制，使用更長的延遲時間
        const timeouts = [
            setTimeout(() => {
                console.log('ScrollToTop: 10ms delayed scroll');
                scrollToTop();
            }, 10),
            
            setTimeout(() => {
                console.log('ScrollToTop: 50ms delayed scroll');
                scrollToTop();
            }, 50),
            
            setTimeout(() => {
                console.log('ScrollToTop: 100ms delayed scroll');
                scrollToTop();
            }, 100),
            
            setTimeout(() => {
                console.log('ScrollToTop: 200ms delayed scroll');
                scrollToTop();
            }, 200),
            
            setTimeout(() => {
                console.log('ScrollToTop: 500ms final scroll');
                scrollToTop();
            }, 500)
        ];
        
        return () => {
            timeouts.forEach(timeout => clearTimeout(timeout));
        };
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
                        <Route path="interactions" element={<InteractionManagement />} />
                        <Route path="contact-messages" element={<ContactMessages />} />
                        <Route path="staff-management" element={<SalesStaffManagement />} />
                        <Route path="sales-data" element={<SalesAnalytics />} />
                        <Route path="performance" element={<Navigate to="/crm/admin/overview" replace />} />
                    </Route>

                    {/* 銷售人員路由 */}
                    <Route 
                        path="/crm/sales/*" 
                        element={
                            <ProtectedRoute requiredRole="staff">
                                <SalesDashboard />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Navigate to="overview" replace />} />
                        <Route path="overview" element={<SalesOverview />} />
                        <Route path="profile" element={<Profile />} />
                        <Route path="my-customers" element={<MyCustomers />} />
                        <Route path="interactions" element={<Interactions />} />
                        <Route path="registration-management" element={<SalesRegistrationManagement />} />
                    </Route>

                    {/* 主網站路由 */}
                    <Route path="/*" element={<MainLayout />} />
                </Routes>
            </Router>
        </LanguageProvider>
    );
}

export default App;
