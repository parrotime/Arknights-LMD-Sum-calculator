import React, { Suspense, lazy, useCallback, useState } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import MainCalculator from "./components/MainCalculator";
import { CursorProvider } from "./components/CursorContext";
import type { AssistantEggPayload } from "./types/calculator";

const NotePage = lazy(() => import("./pages/Note"));
const DataPage = lazy(() => import("./pages/Data"));
const AboutPage = lazy(() => import("./pages/About"));
const MaintenancePage = lazy(() => import("./pages/Maintenance"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboard"));

const AppContent = () => {
  const [assistantEgg, setAssistantEgg] = useState<AssistantEggPayload | null>(null);
  const [typhoonPeekKey, setTyphoonPeekKey] = useState(0);
  const assistantEggRef = React.useRef<AssistantEggPayload | null>(null);

  const handleAssistantEgg = useCallback((payload: AssistantEggPayload | null) => {
    if (!payload || (!payload.imageUrl && !payload.type && !payload.message)) {
      setAssistantEgg(null);
      assistantEggRef.current = null;
      return;
    }
    if (payload.type === "typhoon799-peek") {
      if (assistantEggRef.current?.priority === "high" && payload.priority !== "high") {
        return;
      }
      assistantEggRef.current = null;
      setAssistantEgg(null);
      setTyphoonPeekKey((current) => current + 1);
      return;
    }
    setAssistantEgg((current) => {
      if (current?.priority === "high" && payload.priority !== "high") {
        return current;
      }
      const next = { ...payload, id: Date.now() };
      assistantEggRef.current = next;
      return next;
    });
  }, []);

  return (
    <Layout
      assistantEgg={assistantEgg}
      typhoonPeekKey={typhoonPeekKey}
      onAssistantEggClose={() => {
        assistantEggRef.current = null;
        setAssistantEgg(null);
      }}
    >
      <Suspense fallback={<div style={{ textAlign: "center", padding: "2rem" }}>加载中...</div>}>
        <Routes>
          <Route path="/" element={<MainCalculator onAssistantEgg={handleAssistantEgg} />} />
          <Route path="/note" element={<NotePage />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
        </Routes>
      </Suspense>
    </Layout>
  );
};

const App = () => (
  <CursorProvider>
    <Router>
      <AppContent />
    </Router>
  </CursorProvider>
);

export default App;
