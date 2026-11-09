/**
 * StatusBadge — Menampilkan status verifikasi absensi
 * status: 'menunggu' | 'disetujui' | 'ditolak'
 */
export default function StatusBadge({ status }) {
  const map = {
    menunggu:  { cls: 'badge-warning', icon: '⏳', label: 'Menunggu' },
    disetujui: { cls: 'badge-success', icon: '✅', label: 'Disetujui' },
    ditolak:   { cls: 'badge-danger',  icon: '❌', label: 'Ditolak' },
  };

  const { cls, icon, label } = map[status] ?? { cls: 'badge-info', icon: '❓', label: status };

  return (
    <span className={`badge ${cls}`}>
      {icon} {label}
    </span>
  );
}
