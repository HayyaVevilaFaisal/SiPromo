import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Menu mengikuti use case diagram (UC-01 s.d. UC-10), dikelompokkan seperti rancangan antarmuka
const menuGroups = [
  {
    label: 'Menu Utama',
    items: [{ to: '/', label: 'Dashboard', icon: DashboardIcon }],
  },
  {
    label: 'Kelola Data',
    items: [
      { to: '/aset', label: 'Aset', icon: AsetIcon },
      { to: '/lokasi-penyimpanan', label: 'Lokasi Penyimpanan', icon: LokasiIcon },
      { to: '/vendor', label: 'Vendor', icon: VendorIcon },
      { to: '/tahun-ajaran', label: 'Tahun Ajaran', icon: TahunAjaranIcon },
    ],
  },
  {
    label: 'Pencatatan',
    items: [
      { to: '/penggunaan-aset', label: 'Penggunaan Aset', icon: PenggunaanIcon },
      { to: '/pembelian-aset', label: 'Pembelian Aset', icon: PembelianIcon },
    ],
  },
  {
    label: 'Laporan',
    items: [{ to: '/laporan', label: 'Laporan', icon: LaporanIcon }],
  },
];

function getInitials(nama) {
  if (!nama) return '?';
  return nama.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside style={{
      width: 256, minHeight: '100vh', borderRight: '1px solid #e2e8f0', background: '#fff',
      display: 'flex', flexDirection: 'column',
    }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 24px' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: '#e2e5ea', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>SiPromo</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Informatika UNPAR</div>
        </div>
      </div>

      <nav style={{ flex: 1, paddingBottom: 16 }}>
        {menuGroups.map((group) => (
          <div key={group.label}>
            <div style={{
              padding: '16px 24px 8px', fontSize: 11, fontWeight: 700, color: '#9ca3af',
              textTransform: 'uppercase', letterSpacing: 0.6,
            }}
            >
              {group.label}
            </div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 10,
                  margin: '2px 12px', padding: '8px 10px', borderRadius: 10,
                  textDecoration: 'none', fontSize: 14,
                  color: isActive ? '#155dfc' : '#374151',
                  background: isActive ? '#eff6ff' : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                })}
              >
                <span style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <item.icon />
                </span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: 16,
        borderTop: '1px solid #e2e8f0',
      }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: '#155dfc', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700,
          flexShrink: 0,
        }}
        >
          {getInitials(user?.nama)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.nama}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          title="Keluar"
          style={{
            width: 32, height: 32, borderRadius: 8, background: '#f3f4f6', color: '#6b7280',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0,
          }}
        >
          <LogoutIcon />
        </button>
      </div>
    </aside>
  );
}

function LogoutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function AsetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" />
    </svg>
  );
}

function LokasiIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function VendorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 21V7l7-4 7 4v14" /><path d="M3 21h18" /><path d="M9 21v-6h6v6" />
      <line x1="9" y1="11" x2="9.01" y2="11" /><line x1="15" y1="11" x2="15.01" y2="11" />
    </svg>
  );
}

function TahunAjaranIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function PenggunaanIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

function PembelianIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function LaporanIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}
