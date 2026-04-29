import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Layout } from './components/layout/Layout';
import { AnalysisProvider } from './context/AnalysisContext';
import Overview from './pages/Overview';
import Upload from './pages/Upload';
import Evidence from './pages/Evidence';
import Disagreement from './pages/Disagreement';
import Reports from './pages/Reports';
import About from './pages/About';

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Layout />}>
          <Route index element={
            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
              <Overview />
            </motion.div>
          } />
          <Route path="upload" element={
            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
              <Upload />
            </motion.div>
          } />
          <Route path="evidence" element={
            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
              <Evidence />
            </motion.div>
          } />
          <Route path="disagreement" element={
            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
              <Disagreement />
            </motion.div>
          } />
          <Route path="reports" element={
            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
              <Reports />
            </motion.div>
          } />
          <Route path="about" element={
            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
              <About />
            </motion.div>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <AnalysisProvider>
      <Router>
        <AnimatedRoutes />
      </Router>
    </AnalysisProvider>
  );
}

export default App;
