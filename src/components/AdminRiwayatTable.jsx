import React, { useState } from 'react';
import { useAbsensi } from '../hooks/useAbsensi.jsx';
import { pekerjaan, karyawan } from '../data/mockData';
import StatusBadge from './StatusBadge';
/**
 * AdminRiwayatTable – displays attendance history for all workers.
 * Columns: Tanggal, Pekerjaan, Karyawan, Masuk, Pulang, Durasi, Foto, Status
 */
export default function AdminRiwayatTable() {
  const { absensiList, hitungDurasi } = useAbsensi();
  const [filterKaryawanId, setFilterKaryawanId] = useState('semua');

  const filtered = absensiList.filter(a =>
    filterKaryawanId === 'semua' || a.id_karyawan === Number(filterKaryawanId)
  );

  // Sort newest first
  const sorted = filtered.sort((a, b) => {
    if (b.tanggal !== a.tanggal) return b.tanggal.localeCompare(a.tanggal);
    return (b.jam_masuk || '').localeCompare(a.jam_masuk || '');
  });

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>🗂️ Semua Riwayat Absensi</h3>
        <select
          value={filterKaryawanId}
          onChange={e => setFilterKaryawanId(e.target.value)}
          style={{ padding: '4px 8px', fontSize: 'var(--text-xs)' }}
        >
          <option value="semua">Semua Pekerja</option>
          {karyawan.map(k => (
            <option key={k.id_karyawan} value={k.id_karyawan}>
              {k.nama}
            </option>
          ))}
        </select>
      </div>
      <div className="table-wrapper" style={{ marginTop: 'var(--sp-3)' }}>
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Pekerjaan</th>
              <th>Karyawan</th>
              <th>Masuk</th>
              <th>Pulang</th>
              <th>Durasi</th>
              <th>Foto</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(a => {
              const pj = pekerjaan.find(p => p.id_pekerjaan === a.id_pekerjaan);
              const kr = karyawan.find(k => k.id_karyawan === a.id_karyawan);
              const dur = hitungDurasi(a.jam_masuk, a.jam_pulang);
              return (
                <tr key={a.id_absensi}>
                  <td style={{ color: 'var(--clr-text-primary)', fontWeight: 500 }}>{a.tanggal}</td>
                  <td style={{ maxWidth: 150 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pj?.nama_pekerjaan ?? '—'}
                    </div>
                  </td>
                  <td>{kr?.nama ?? '—'}</td>
                  <td>
                    <div>{a.jam_masuk ?? '—'}</div>
                    {a.lokasi_masuk?.alamat && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--clr-text-muted)', marginTop: 2 }} title={a.lokasi_masuk.alamat}>
                        📍 {a.lokasi_masuk.alamat}
                      </div>
                    )}
                  </td>
                  <td>
                    <div>{a.jam_pulang ?? (<span style={{ color: 'var(--clr-success)', fontSize: 'var(--text-xs)' }}>Aktif</span>)}</div>
                    {a.lokasi_pulang?.alamat && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--clr-text-muted)', marginTop: 2 }} title={a.lokasi_pulang.alamat}>
                        📍 {a.lokasi_pulang.alamat}
                      </div>
                    )}
                  </td>
                  <td style={{ fontWeight: 600 }}>{dur ? dur.label : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {a.foto_masuk ? (
                        <img
                          src={a.foto_masuk}
                          alt="Masuk"
                          title="Klik untuk lihat foto masuk"
                          onClick={() => window.open(a.foto_masuk, '_blank')}
                          style={{ width: 36, height: 28, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--clr-border)', cursor: 'pointer' }}
                        />
                      ) : (
                        <span title="Belum ada foto masuk" style={{ fontSize: '0.7rem', color: 'var(--clr-text-muted)' }}>📷—</span>
                      )}
                      {a.jam_pulang && (
                        a.foto_pulang ? (
                          <img
                            src={a.foto_pulang}
                            alt="Pulang"
                            title="Klik untuk lihat foto pulang"
                            onClick={() => window.open(a.foto_pulang, '_blank')}
                            style={{ width: 36, height: 28, objectFit: 'cover', borderRadius: 4, border: '1px solid rgba(239,68,68,0.5)', cursor: 'pointer' }}
                          />
                        ) : (
                          <span title="Belum ada foto pulang" style={{ fontSize: '0.7rem', color: 'var(--clr-text-muted)' }}>🏠—</span>
                        )
                      )}
                    </div>
                  </td>
                  <td><StatusBadge status={a.status_verifikasi} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
