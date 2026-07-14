import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Aset from './pages/Aset/Aset';
import Vendor from './pages/Vendor/Vendor';
import LokasiPenyimpanan from './pages/LokasiPenyimpanan/LokasiPenyimpanan';
import TahunAjaran from './pages/TahunAjaran/TahunAjaran';
import PenggunaanAset from './pages/PenggunaanAset/PenggunaanAset';
import PembelianAset from './pages/PembelianAset/PembelianAset';
import Laporan from './pages/Laporan/Laporan';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/aset" element={<Aset />} />
          <Route path="/vendor" element={<Vendor />} />
          <Route path="/lokasi-penyimpanan" element={<LokasiPenyimpanan />} />
          <Route path="/tahun-ajaran" element={<TahunAjaran />} />
          <Route path="/penggunaan-aset" element={<PenggunaanAset />} />
          <Route path="/pembelian-aset" element={<PembelianAset />} />
          <Route path="/laporan" element={<Laporan />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
