import { useState } from 'react';
import { absensiAwal, hitungDurasi, karyawan, pekerjaan } from '../data/mockData';
import StatusBadge from './StatusBadge';

const pekerjaanDiData = pekerjaan.filter((job) =>
  absensiAwal.some((record) => record.id_pekerjaan === job.id_pekerjaan)
);
const karyawanDiData = karyawan.filter((worker) =>
  absensiAwal.some((record) => record.id_karyawan === worker.id_karyawan)
);

export default function AdminSessionsTable() {
  const [filterPekerjaanId, setFilterPekerjaanId] = useState('semua');
  const [filterKaryawanId, setFilterKaryawanId] = useState('semua');

  const dataFiltered = absensiAwal
    .filter((record) =>
      filterPekerjaanId === 'semua' || record.id_pekerjaan === Number(filterPekerjaanId)
    )
    .filter((record) =>
      filterKaryawanId === 'semua' || record.id_karyawan === Number(filterKaryawanId)
    )
    .sort((a, b) => {
      const byDate = b.tanggal.localeCompare(a.tanggal);
      return byDate || (b.jam_masuk ?? '').localeCompare(a.jam_masuk ?? '');
    });

  return (
    <section id="dashboard-sessions" className="dashboard-panel dashboard-sessions-panel">
      <div className="panel-heading dashboard-sessions-heading">
        <div>
          <span className="panel-kicker">RIWAYAT ABSENSI</span>
          <h2>Daftar Sesi Kerja Karyawan</h2>
        </div>
        <div className="session-filters">
          <label className="sr-only" htmlFor="dashboard-filter-pekerjaan">Filter pekerjaan</label>
          <select
            id="dashboard-filter-pekerjaan"
            value={filterPekerjaanId}
            onChange={(event) => setFilterPekerjaanId(event.target.value)}
          >
            <option value="semua">Semua Pekerjaan</option>
            {pekerjaanDiData.map((job) => (
              <option key={job.id_pekerjaan} value={job.id_pekerjaan}>{job.nama_pekerjaan}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="dashboard-filter-karyawan">Filter karyawan</label>
          <select
            id="dashboard-filter-karyawan"
            value={filterKaryawanId}
            onChange={(event) => setFilterKaryawanId(event.target.value)}
          >
            <option value="semua">Semua Karyawan</option>
            {karyawanDiData.map((worker) => (
              <option key={worker.id_karyawan} value={worker.id_karyawan}>{worker.nama}</option>
            ))}
          </select>
        </div>
      </div>

      {dataFiltered.length === 0 ? (
        <div className="empty-state">
          <span className="icon">📭</span>
          <span>Tidak ada data sesi kerja</span>
        </div>
      ) : (
        <div className="table-wrapper dashboard-sessions-table">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Nama Karyawan</th>
                <th>Pekerjaan</th>
                <th>Masuk</th>
                <th>Pulang</th>
                <th>Durasi</th>
                <th>Foto</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {dataFiltered.map((record) => {
                const job = pekerjaan.find((item) => item.id_pekerjaan === record.id_pekerjaan);
                const worker = karyawan.find((item) => item.id_karyawan === record.id_karyawan);
                const duration = hitungDurasi(record.jam_masuk, record.jam_pulang);

                return (
                  <tr key={record.id_absensi}>
                    <td className="session-date">{record.tanggal}</td>
                    <td>
                      <strong className="session-worker-name">{worker?.nama ?? '—'}</strong>
                      <span className="session-worker-role">{worker?.jabatan ?? ''}</span>
                    </td>
                    <td className="session-job" title={job?.nama_pekerjaan}>
                      {job?.nama_pekerjaan ?? '—'}
                    </td>
                    <td>
                      <span>{record.jam_masuk ?? '—'}</span>
                      {record.lokasi_masuk?.alamat && (
                        <span className="session-location" title={record.lokasi_masuk.alamat}>
                          📍 {record.lokasi_masuk.alamat}
                        </span>
                      )}
                    </td>
                    <td>
                      <span>
                        {record.jam_pulang ?? <span className="session-active">Aktif</span>}
                      </span>
                      {record.lokasi_pulang?.alamat && (
                        <span className="session-location" title={record.lokasi_pulang.alamat}>
                          📍 {record.lokasi_pulang.alamat}
                        </span>
                      )}
                    </td>
                    <td>{duration?.label ?? '—'}</td>
                    <td>
                      <div className="session-photos">
                        {record.foto_masuk ? (
                          <a href={record.foto_masuk} target="_blank" rel="noreferrer" aria-label="Lihat foto masuk">
                            <img src={record.foto_masuk} alt="Foto masuk" />
                          </a>
                        ) : <span title="Belum ada foto masuk">📷—</span>}
                        {record.jam_pulang && (record.foto_pulang ? (
                          <a href={record.foto_pulang} target="_blank" rel="noreferrer" aria-label="Lihat foto pulang">
                            <img src={record.foto_pulang} alt="Foto pulang" />
                          </a>
                        ) : <span title="Belum ada foto pulang">🏠—</span>)}
                      </div>
                    </td>
                    <td><StatusBadge status={record.status_verifikasi} /></td>
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
