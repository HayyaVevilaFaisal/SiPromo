import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Suvenir from './pages/Suvenir/Suvenir';
import Vendor from './pages/Vendor/Vendor';
import LokasiPenyimpanan from './pages/LokasiPenyimpanan/LokasiPenyimpanan';
import TahunAjaran from './pages/TahunAjaran/TahunAjaran';
import PenggunaanSuvenir from './pages/PenggunaanSuvenir/PenggunaanSuvenir';
import PembelianSuvenir from './pages/PembelianSuvenir/PembelianSuvenir';
import Laporan from './pages/Laporan/Laporan';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/suvenir" element={<Suvenir />} />
          <Route path="/vendor" element={<Vendor />} />
          <Route path="/lokasi-penyimpanan" element={<LokasiPenyimpanan />} />
          <Route path="/tahun-ajaran" element={<TahunAjaran />} />
          <Route path="/penggunaan-suvenir" element={<PenggunaanSuvenir />} />
          <Route path="/pembelian-suvenir" element={<PembelianSuvenir />} />
          <Route path="/laporan" element={<Laporan />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
