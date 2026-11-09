import { pekerjaan } from '../data/mockData';
import { useAbsensi } from '../hooks/useAbsensi.jsx';

export default function WorkerJobContribution({ sessions }) {
  const { hitungDurasi } = useAbsensi();
  const jobsWithSessions = pekerjaan.filter((job) =>
    sessions.some((session) => session.id_pekerjaan === job.id_pekerjaan)
  );

  if (jobsWithSessions.length === 0) return null;

  const contributions = jobsWithSessions.map((job) => {
    const totalMenit = sessions
      .filter((session) =>
        session.id_pekerjaan === job.id_pekerjaan &&
        session.status_verifikasi === 'disetujui' &&
        session.jam_pulang
      )
      .reduce((total, session) => {
        const duration = hitungDurasi(session.jam_masuk, session.jam_pulang);
        return total + (duration?.totalMenit ?? 0);
      }, 0);

    return { job, totalMenit };
  });
  const totalMenitKeseluruhan = contributions.reduce(
    (total, contribution) => total + contribution.totalMenit,
    0
  );

  return (
    <section className="worker-contribution-panel">
      <div className="worker-contribution-heading">
        <h2><span aria-hidden="true">🏗️</span> Kontribusi Per Pekerjaan</h2>
      </div>
      <div className="worker-contribution-list">
        {contributions.map(({ job, totalMenit }) => {
          const percentage = totalMenitKeseluruhan > 0
            ? Math.round((totalMenit / totalMenitKeseluruhan) * 100)
            : 0;
          const hours = Math.floor(totalMenit / 60);
          const minutes = totalMenit % 60;

          return (
            <div className="worker-contribution-row" key={job.id_pekerjaan}>
              <div className="worker-contribution-summary">
                <span title={job.nama_pekerjaan}>{job.nama_pekerjaan}</span>
                <strong>
                  {hours}j {minutes}m <span>({percentage}%)</span>
                </strong>
              </div>
              <div
                className="worker-contribution-track"
                role="progressbar"
                aria-label={`Kontribusi ${job.nama_pekerjaan}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percentage}
              >
                <span style={{ width: `${percentage}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
