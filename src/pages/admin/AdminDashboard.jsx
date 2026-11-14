import { NavLink } from 'react-router-dom';
import { absensiAwal, karyawan, pekerjaan } from '../../data/mockData';
import AdminSessionsTable from '../../components/AdminSessionsTable';
import AttendanceStatsChart from '../../components/AttendanceStatsChart';

const activeJobs = pekerjaan.filter((job) => job.status === 'aktif');
const waitingReviews = absensiAwal.filter((record) => record.status_verifikasi === 'menunggu').length;
const approvedRecords = absensiAwal.filter((record) => record.status_verifikasi === 'disetujui').length;
export default function AdminDashboard() {
  const approvalRate = absensiAwal.length
    ? Math.round((approvedRecords / absensiAwal.length) * 100)
    : 0;

  return (
    <div className="dashboard-page">
      <section className="dashboard-welcome">
        <div className="welcome-copy">
          <span className="welcome-eyebrow">RINGKASAN HARIAN</span>
          <h1>Selamat Datang, Administrator!</h1>
          <p>Pantau aktivitas kerja dan kehadiran tim Anda dari satu tempat.</p>
        </div>
        <span className="welcome-decoration" aria-hidden="true">✦</span>
      </section>

      <section className="dashboard-stats" aria-label="Ringkasan data">
        <StatCard icon="♙" label="Total Karyawan" value={karyawan.length} tone="blue" detail="Karyawan terdaftar" />
        <StatCard icon="▣" label="Pekerjaan Aktif" value={activeJobs.length} tone="purple" detail="Sedang berjalan" />
        <StatCard icon="◷" label="Total Sesi Kerja" value={absensiAwal.length} tone="green" detail="Seluruh catatan absensi" />
        <StatCard icon="!" label="Menunggu Review" value={waitingReviews} tone="orange" detail="Perlu ditinjau admin" />
      </section>

      <section className="dashboard-panels">
        <article className="dashboard-panel jobs-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">OPERASIONAL</span>
              <h2>Pekerjaan Berjalan</h2>
            </div>
            <NavLink to="/admin/pekerjaan" className="panel-link">Kelola pekerjaan <span aria-hidden="true">→</span></NavLink>
          </div>
          <div className="job-list">
            {activeJobs.map((job, index) => {
              const assignedCount = new Set(
                absensiAwal
                  .filter((record) => record.id_pekerjaan === job.id_pekerjaan)
                  .map((record) => record.id_karyawan)
              ).size;

              return (
                <div className="job-row" key={job.id_pekerjaan}>
                  <span className={`job-icon job-icon-${index + 1}`} aria-hidden="true">
                    {index === 0 ? '⌖' : '▧'}
                  </span>
                  <div className="job-info">
                    <strong>{job.nama_pekerjaan}</strong>
                    <span>{job.shift_mulai} – {job.shift_selesai} · {assignedCount} pekerja tercatat</span>
                  </div>
                  <span className="job-status"><i /> Aktif</span>
                </div>
              );
            })}
          </div>
          <div className="panel-footer">
            <span>{activeJobs.length} pekerjaan aktif</span>
            <NavLink to="/admin/pekerjaan">Lihat semua <span aria-hidden="true">→</span></NavLink>
          </div>
        </article>

        <article className="dashboard-panel review-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">KEHADIRAN</span>
              <h2>Status Verifikasi</h2>
            </div>
            <span className="review-total">{absensiAwal.length} sesi</span>
          </div>
          <div className="approval-overview">
            <div className="approval-ring" style={{ '--approval-rate': `${approvalRate}%` }}>
              <div>
                <strong>{approvalRate}%</strong>
                <span>Disetujui</span>
              </div>
            </div>
            <div className="approval-legend">
              <LegendRow color="green" label="Disetujui" value={approvedRecords} />
              <LegendRow color="orange" label="Menunggu" value={waitingReviews} />
              <LegendRow color="red" label="Ditolak" value={absensiAwal.filter((record) => record.status_verifikasi === 'ditolak').length} />
            </div>
          </div>
          <NavLink className="review-cta" to="/admin#dashboard-sessions">
            Tinjau data absensi <span aria-hidden="true">→</span>
          </NavLink>
        </article>
      </section>

      <AdminSessionsTable />
      <AttendanceStatsChart />
    </div>
  );
}

function StatCard({ icon, label, value, tone, detail }) {
  return (
    <article className={`stat-card stat-card-${tone}`}>
      <div className="stat-card-top">
        <span className="stat-icon" aria-hidden="true">{icon}</span>
        <span className="stat-trend">Ringkasan</span>
      </div>
      <strong className="stat-value">{value}</strong>
      <span className="stat-label">{label}</span>
      <span className="stat-detail">{detail}</span>
    </article>
  );
}

function LegendRow({ color, label, value }) {
  return (
    <div className="legend-row">
      <span className={`legend-dot legend-dot-${color}`} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
