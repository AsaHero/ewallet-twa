import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Lazy load page components for code splitting
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const TransactionPage = lazy(() => import('./pages/TransactionPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const CategoryStatsPage = lazy(() => import('./pages/CategoryStatsPage'));
const SubcategoryStatsPage = lazy(() => import('./pages/SubcategoryStatsPage'));

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/history" replace />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/transaction" element={<TransactionPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/stats/category/:categoryId" element={<CategoryStatsPage />} />
          <Route path="/stats/subcategory/:subcategoryId" element={<SubcategoryStatsPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
