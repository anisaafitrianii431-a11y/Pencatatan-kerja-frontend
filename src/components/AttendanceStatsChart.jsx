import { useMemo, useState } from 'react';
import { absensiAwal, hitungDurasi, karyawan } from '../data/mockData';

const periods = [
  { id: 'hari', label: 'Hari Ini' },
  { id: 'minggu', label: '1 Minggu' },
  { id: 'bulan', label: 'Bulanan' },
  { id: 'tahun', label: 'Tahunan' },
  { id: 'custom', label: '📅 Pilih Tgl' },
];

const categories = [
  { key: 'setuju', label: 'Disetujui', color: '#10a879' },
  { key: 'menunggu', label: 'Menunggu', color: '#ef9a16' },
  { key: 'ditolak', label: 'Ditolak', color: '#e54848' },
];

function getToday() {
  const date = new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function filterByPeriod(records, period, customDate) {
  if (period === 'custom') {
    return customDate ? records.filter((record) => record.tanggal === customDate) : [];
  }

  const today = getToday();
  const todayDate = new Date(`${today}T00:00:00`);
  return records.filter((record) => {
    const recordDate = new Date(`${record.tanggal}T00:00:00`);
    const daysAgo = (todayDate - recordDate) / 86400000;
    if (period === 'hari') return record.tanggal === today;
    if (period === 'minggu') return daysAgo >= 0 && daysAgo < 7;
    if (period === 'bulan') {
      return recordDate.getFullYear() === todayDate.getFullYear()
        && recordDate.getMonth() === todayDate.getMonth();
    }
    if (period === 'tahun') return recordDate.getFullYear() === todayDate.getFullYear();
    return true;
  });
}

export default function AttendanceStatsChart() {
  const [period, setPeriod] = useState('minggu');
  const [customDate, setCustomDate] = useState('');

  const chartData = useMemo(() => {
    const records = filterByPeriod(absensiAwal, period, customDate);
    return karyawan.map((worker) => {
      const sessions = records.filter((record) => record.id_karyawan === worker.id_karyawan);
      const minutes = sessions.reduce((sum, record) => {
        const duration = hitungDurasi(record.jam_masuk, record.jam_pulang);
        return sum + (duration?.totalMenit ?? 0);
      }, 0);

      return {
        worker,
        total: sessions.length,
        setuju: sessions.filter((record) => record.status_verifikasi === 'disetujui').length,
        menunggu: sessions.filter((record) => record.status_verifikasi === 'menunggu').length,
        ditolak: sessions.filter((record) => record.status_verifikasi === 'ditolak').length,
        minutes,
        durationLabel: `${Math.floor(minutes / 60)}j ${minutes % 60}m`,
      };
    });
  }, [period, customDate]);

  const maxValue = Math.max(...chartData.map((item) => item.total), 1);
  const ticks = maxValue === 1 ? [0, 1] : [0, maxValue];
  const periodLabel = period === 'custom' && customDate
    ? customDate
    : periods.find((item) => item.id === period)?.label;

  function choosePeriod(id) {
    setPeriod(id);
    if (id !== 'custom') setCustomDate('');
  }

  return (
    <section className="dashboard-panel attendance-chart-panel">
      <div className="panel-heading attendance-chart-heading">
        <div>
          <span className="panel-kicker">LAPORAN KEHADIRAN</span>
          <h2>Statistik Kehadiran Karyawan</h2>
          <p>Perbandingan sesi kerja per karyawan berdasarkan status verifikasi</p>
        </div>
        <div className="chart-period-controls">
          <label className="sr-only" htmlFor="filter-periode-statistik">Filter periode statistik</label>
          <select
            id="filter-periode-statistik"
            className="chart-period-select"
            value={period}
            onChange={(event) => choosePeriod(event.target.value)}
          >
            {periods.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
          {period === 'custom' && (
            <div className="chart-date-control">
              <label className="sr-only" htmlFor="input-tanggal-custom">Pilih tanggal khusus</label>
            <input
              id="input-tanggal-custom"
              type="date"
              value={customDate}
              onChange={(event) => {
                setCustomDate(event.target.value);
                setPeriod('custom');
              }}
              title="Input tanggal kerja spesifik"
            />
            </div>
          )}
        </div>
      </div>

      <div className="attendance-chart-body">
        <div className="chart-legend">
          {categories.map((category) => (
            <span key={category.key}>
              <i style={{ background: category.color }} />
              {category.label}
            </span>
          ))}
        </div>

        <div className="attendance-chart">
          <div className="chart-scale" aria-hidden="true">
            <span />
            <div>{ticks.map((tick) => <span key={tick}>{tick}</span>)}</div>
            <span>Total</span>
          </div>
          <div className="chart-worker-list">
            {chartData.map((item) => (
              <div className="chart-worker-row" key={item.worker.id_karyawan}>
                <div className="chart-worker-label">
                  <strong>{item.worker.nama}</strong>
                  <span>{item.worker.jabatan}</span>
                  <small>◷ {item.minutes ? item.durationLabel : '—'}</small>
                </div>
                <div
                  className="chart-stacked-bar"
                  role="img"
                  aria-label={`${item.worker.nama}: ${item.setuju} disetujui, ${item.menunggu} menunggu, ${item.ditolak} ditolak`}
                >
                  {categories.map((category) => {
                    const value = item[category.key];
                    if (!value) return null;

                    return (
                      <span
                        key={category.key}
                        className="chart-bar-segment"
                        title={`${category.label}: ${value} sesi`}
                        style={{
                          '--segment-color': category.color,
                          '--segment-value': value,
                          '--bar-total': maxValue,
                        }}
                      >
                        {value > 1 && <b>{value}</b>}
                      </span>
                    );
                  })}
                  {!item.total && <span className="chart-bar-empty" />}
                </div>
                <strong className="chart-worker-total">{item.total}</strong>
              </div>
            ))}
            {chartData.every((item) => item.total === 0) && (
              <div className="chart-empty">
                <span>📭</span>
                {period === 'custom' && !customDate
                  ? 'Pilih tanggal untuk melihat data'
                  : 'Tidak ada data pada periode ini'}
              </div>
            )}
          </div>
        </div>

        <div className="chart-footer">
          <span>📆 Periode aktif: <strong>{periodLabel}</strong></span>
          <span>Total karyawan: {karyawan.length} orang</span>
        </div>
      </div>
    </section>
  );
}
