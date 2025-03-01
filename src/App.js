import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
    return (
        <LanguageProvider>
            <Router>
                <Navbar />
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
            </Router>
        </LanguageProvider>
    );
}

export default App;
