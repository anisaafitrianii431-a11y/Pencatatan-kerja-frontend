import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAbsensi } from '../hooks/useAbsensi.jsx';
import { pekerjaan } from '../data/mockData';
import StatusBadge from './StatusBadge';

export default function WorkerSessionsTable() {
  const { currentUser } = useAuth();
  const { getRiwayatByKaryawan, hitungDurasi } = useAbsensi();
  const workerId = currentUser?.karyawan?.id_karyawan;
  const sessions = workerId ? getRiwayatByKaryawan(workerId) : [];
  const jobs = pekerjaan.filter((job) =>
    sessions.some((session) => session.id_pekerjaan === job.id_pekerjaan)
  );
  const [filterPekerjaanId, setFilterPekerjaanId] = useState('semua');
  const filteredSessions = filterPekerjaanId === 'semua'
    ? sessions
    : sessions.filter((session) => session.id_pekerjaan === Number(filterPekerjaanId));

  return (
    <section className="worker-sessions-panel" id="worker-sessions">
      <div className="worker-section-heading worker-sessions-heading">
        <div>
          <span className="worker-section-kicker">RIWAYAT ABSENSI</span>
          <h2>Daftar Sesi Kerja</h2>
        </div>
        <label className="sr-only" htmlFor="worker-filter-pekerjaan">Filter pekerjaan</label>
        <select
          id="worker-filter-pekerjaan"
          value={filterPekerjaanId}
          onChange={(event) => setFilterPekerjaanId(event.target.value)}
        >
          <option value="semua">Semua Pekerjaan</option>
          {jobs.map((job) => (
            <option key={job.id_pekerjaan} value={job.id_pekerjaan}>
              {job.nama_pekerjaan}
            </option>
          ))}
        </select>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="worker-empty-state">
          <span aria-hidden="true">📭</span>
          <strong>Belum ada data sesi kerja</strong>
          <span>Riwayat absensi Anda akan muncul di sini.</span>
        </div>
      ) : (
        <div className="table-wrapper worker-sessions-table">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Pekerjaan</th>
                <th>Masuk</th>
                <th>Pulang</th>
                <th>Durasi</th>
                <th>Foto</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((session) => {
                const job = pekerjaan.find((item) => item.id_pekerjaan === session.id_pekerjaan);
                const duration = hitungDurasi(session.jam_masuk, session.jam_pulang);

                return (
                  <tr key={session.id_absensi}>
                    <td className="worker-session-date">{session.tanggal}</td>
                    <td className="worker-session-job" title={job?.nama_pekerjaan}>
                      {job?.nama_pekerjaan ?? '—'}
                    </td>
                    <td>
                      <span>{session.jam_masuk ?? '—'}</span>
                      {session.lokasi_masuk?.alamat && (
                        <span className="worker-session-location" title={session.lokasi_masuk.alamat}>
                          📍 {session.lokasi_masuk.alamat}
                        </span>
                      )}
                    </td>
                    <td>
                      <span>
                        {session.jam_pulang ?? <span className="worker-session-active">Aktif</span>}
                      </span>
                      {session.lokasi_pulang?.alamat && (
                        <span className="worker-session-location" title={session.lokasi_pulang.alamat}>
                          📍 {session.lokasi_pulang.alamat}
                        </span>
                      )}
                    </td>
                    <td>{duration?.label ?? '—'}</td>
                    <td>
                      <div className="worker-session-photos">
                        {session.foto_masuk ? (
                          <a href={session.foto_masuk} target="_blank" rel="noreferrer" aria-label="Lihat foto masuk">
                            <img src={session.foto_masuk} alt="Foto masuk" />
                          </a>
                        ) : <span title="Belum ada foto masuk">📷—</span>}
                        {session.jam_pulang && (session.foto_pulang ? (
                          <a href={session.foto_pulang} target="_blank" rel="noreferrer" aria-label="Lihat foto pulang">
                            <img src={session.foto_pulang} alt="Foto pulang" />
                          </a>
                        ) : <span title="Belum ada foto pulang">🏠—</span>)}
                      </div>
                    </td>
                    <td><StatusBadge status={session.status_verifikasi} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
