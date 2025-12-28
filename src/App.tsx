import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HistoryPage from './pages/HistoryPage';
import TransactionPage from './pages/TransactionPage';
import StatsPage from './pages/StatsPage';
import CategoryStatsPage from './pages/CategoryStatsPage';
import SubcategoryStatsPage from './pages/SubcategoryStatsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/history" replace />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/transaction" element={<TransactionPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/stats/category/:categoryId" element={<CategoryStatsPage />} />
        <Route path="/stats/subcategory/:subcategoryId" element={<SubcategoryStatsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
