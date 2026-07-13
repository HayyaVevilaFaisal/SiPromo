import { NavLink } from 'react-router-dom';

// Menu mengikuti use case diagram (UC-01 s.d. UC-10)
const menu = [
  { to: '/', label: 'Dashboard' },
  { to: '/suvenir', label: 'Suvenir' },
  { to: '/lokasi-penyimpanan', label: 'Lokasi Penyimpanan' },
  { to: '/vendor', label: 'Vendor' },
  { to: '/tahun-ajaran', label: 'Tahun Ajaran' },
  { to: '/penggunaan-suvenir', label: 'Penggunaan Suvenir' },
  { to: '/pembelian-suvenir', label: 'Pembelian Suvenir' },
  { to: '/laporan', label: 'Laporan' },
];

export default function Sidebar() {
  return (
    <aside style={{ width: 220, minHeight: '100vh', borderRight: '1px solid #e2e8f0', background: '#fff' }}>
      <div style={{ padding: 16, fontWeight: 'bold', color: '#1F4E78' }}>SiPromo</div>
      <nav>
        {menu.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={({ isActive }) => ({
              display: 'block',
              padding: '10px 16px',
              textDecoration: 'none',
              fontSize: 14,
              color: isActive ? '#1F4E78' : '#333',
              background: isActive ? '#EAF1F8' : 'transparent',
              fontWeight: isActive ? 600 : 400,
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
