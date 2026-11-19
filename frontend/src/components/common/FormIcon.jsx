export default function FormIcon({ icon: Icon }) {
  return (
    <div aria-hidden="true" style={{
      width: 44, height: 44, borderRadius: 10, background: '#eff6ff', color: '#155dfc',
      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon size={20} />
    </div>
  );
}
