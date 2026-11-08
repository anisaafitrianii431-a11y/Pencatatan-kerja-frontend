import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAbsensi } from '../../hooks/useAbsensi.jsx';
import { getPekerjaanAktifByKaryawan } from '../../data/mockData';
import WorkerSessionsTable from '../../components/WorkerSessionsTable';
import WorkerJobContribution from '../../components/WorkerJobContribution';

export default function WorkerDashboard() {
  const { currentUser } = useAuth();
  const { getRiwayatByKaryawan, getTotalJamDisetujui } = useAbsensi();
  const worker = currentUser?.karyawan;
  const workerId = worker?.id_karyawan;
  const jobs = workerId ? getPekerjaanAktifByKaryawan(workerId) : [];
  const sessions = workerId ? getRiwayatByKaryawan(workerId) : [];
  const approvedCount = sessions.filter((session) => session.status_verifikasi === 'disetujui').length;
  const pendingCount = sessions.filter((session) => session.status_verifikasi === 'menunggu').length;
  const approvedHours = workerId ? getTotalJamDisetujui(workerId) : { label: '0j 0m' };
  const activeSession = sessions.find((session) => !session.jam_pulang);

  return (
    <div className="worker-dashboard">
      <section className="worker-welcome">
        <div className="worker-welcome-copy">
          <span className="worker-welcome-tag">👷 Area Kerja Karyawan</span>
          <h1>Halo, {worker?.nama?.split(' ')[0] ?? 'Pekerja'}!</h1>
          <p>
            Profesi: <strong>{worker?.jabatan ?? 'Pekerja'}</strong>. Pantau pekerjaan,
            catat jam kerja, dan lihat status absensi Anda di sini.
          </p>
          <div className="worker-welcome-actions">
            <NavLink className="worker-action-primary" to="/pekerja/absensi">
              <span aria-hidden="true">▷</span>
              {activeSession ? 'Absen Pulang Sekarang' : 'Absen Masuk / Pulang Sekarang'}
            </NavLink>
          </div>
        </div>
        <span className="worker-welcome-decoration" aria-hidden="true" />
      </section>

      <section className="worker-stats" aria-label="Ringkasan pekerjaan saya">
        <WorkerStat
          icon="◷"
          tone="blue"
          label="Jam Kerja Disetujui"
          value={approvedHours.label}
          detail={`${approvedCount} sesi kerja disetujui`}
        />
        <WorkerStat
          icon="▤"
          tone="green"
          label="Total Sesi Kerja"
          value={sessions.length}
          detail="Catatan absensi Anda"
        />
        <WorkerStat
          icon="◌"
          tone="orange"
          label="Menunggu Verifikasi"
          value={pendingCount}
          detail="Sesi menunggu pemeriksaan"
        />
        <WorkerStat
          icon="⌂"
          tone="purple"
          label="Pekerjaan Saya"
          value={`${jobs.length} Proyek`}
          detail="Pekerjaan aktif yang ditugaskan"
        />
      </section>

      <section className="worker-jobs-panel" id="worker-jobs">
        <div className="worker-section-heading">
          <div>
            <span className="worker-section-kicker">PENUGASAN</span>
            <h2>Pekerjaan yang Ditugaskan Kepada Saya</h2>
            <p>Pilih pekerjaan untuk melihat detail dan melakukan absensi.</p>
          </div>
          <NavLink to="/pekerja/absensi" className="worker-see-all">
            Lihat Absensi <span aria-hidden="true">↗</span>
          </NavLink>
        </div>

        {jobs.length === 0 ? (
          <div className="worker-empty-state">
            <span aria-hidden="true">📭</span>
            <strong>Belum ada pekerjaan aktif</strong>
            <span>Daftar pekerjaan akan muncul di sini saat Anda mendapat penugasan.</span>
          </div>
        ) : (
          <div className="worker-jobs-grid">
            {jobs.map((job, index) => {
              const isActive = activeSession?.id_pekerjaan === job.id_pekerjaan;
              return (
                <article className="worker-job-card" key={job.id_pekerjaan}>
                  <div className="worker-job-card-top">
                    <span className={`worker-job-icon worker-job-icon-${index % 2}`} aria-hidden="true">
                      ⌂
                    </span>
                    <span className={isActive ? 'worker-job-status worker-job-status-active' : 'worker-job-status'}>
                      <i /> {isActive ? 'Sedang Berjalan' : 'Sedang Berjalan'}
                    </span>
                  </div>
                  <h3>{job.nama_pekerjaan}</h3>
                  <p>{job.deskripsi}</p>
                  <div className="worker-job-meta">
                    <span>◷ Shift {job.shift_mulai} – {job.shift_selesai}</span>
                    {job.latitude && job.longitude && (
                      <a
                        href={`https://maps.google.com/?q=${job.latitude},${job.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        📍 Lihat lokasi
                      </a>
                    )}
                  </div>
                  <NavLink className="worker-job-action" to="/pekerja/absensi">
                    {isActive ? 'Lanjutkan Absensi' : 'Buka Absensi'} <span aria-hidden="true">→</span>
                  </NavLink>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <WorkerJobContribution sessions={sessions} />
      <WorkerSessionsTable />
    </div>
  );
}

function WorkerStat({ icon, tone, label, value, detail }) {
  return (
    <article className={`worker-stat worker-stat-${tone}`}>
      <div className="worker-stat-top">
        <span className="worker-stat-icon" aria-hidden="true">{icon}</span>
        <span className="worker-stat-label">{label}</span>
      </div>
      <strong className="worker-stat-value">{value}</strong>
      <span className="worker-stat-detail">{detail}</span>
    </article>
  );
}
