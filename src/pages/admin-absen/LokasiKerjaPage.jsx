import { useState, useRef } from 'react';
import { 
  MapPin, 
  Navigation, 
  ExternalLink, 
  UploadCloud, 
  Trash2, 
  Clock, 
  FileText, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Briefcase
} from 'lucide-react';
import { pekerjaan } from '../../data/mockData';

/**
 * LokasiKerjaPage — Form Admin untuk input koordinat & foto lokasi kerja
 * 
 * Menyimpan latitude, longitude, dan foto_lokasi ke data pekerjaan.
 */
export default function LokasiKerjaPage() {
  const [listPekerjaan, setListPekerjaan] = useState(pekerjaan);
  const [selectedId, setSelectedId] = useState(pekerjaan[0]?.id_pekerjaan ?? null);
  const [form, setForm] = useState({
    latitude: pekerjaan[0]?.latitude ?? '',
    longitude: pekerjaan[0]?.longitude ?? '',
    foto_lokasi: null,
    fotoPreview: pekerjaan[0]?.foto_lokasi ?? null,
  });
  const [pesan, setPesan] = useState(null);
  const fileInputRef = useRef();

  const selectedPekerjaan = listPekerjaan.find(p => p.id_pekerjaan === selectedId);

  function handlePilihPekerjaan(id) {
    const pj = listPekerjaan.find(p => p.id_pekerjaan === id);
    setSelectedId(id);
    setForm({
      latitude: pj?.latitude ?? '',
      longitude: pj?.longitude ?? '',
      foto_lokasi: null,
      fotoPreview: pj?.foto_lokasi ?? null,
    });
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleFoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setForm(prev => ({
        ...prev,
        foto_lokasi: file,
        fotoPreview: ev.target.result,
      }));
    };
    reader.readAsDataURL(file);
  }

  function handleHapusFoto() {
    setForm(prev => ({ ...prev, foto_lokasi: null, fotoPreview: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleSimpan(e) {
    e.preventDefault();
    if (!selectedId) return;
    if (!form.latitude || !form.longitude) {
      setPesan({ type: 'error', text: 'Latitude dan Longitude wajib diisi.' });
      setTimeout(() => setPesan(null), 3000);
      return;
    }

    setListPekerjaan(prev =>
      prev.map(pj =>
        pj.id_pekerjaan === selectedId
          ? {
              ...pj,
              latitude: form.latitude,
              longitude: form.longitude,
              foto_lokasi: form.fotoPreview ?? pj.foto_lokasi,
            }
          : pj
      )
    );
    setPesan({ type: 'success', text: 'Lokasi kerja berhasil disimpan!' });
    setTimeout(() => setPesan(null), 3000);
  }

  function handleLihatPeta() {
    if (form.latitude && form.longitude) {
      window.open(
        `https://maps.google.com/?q=${form.latitude},${form.longitude}`,
        '_blank'
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 mb-1">
          <span>Manajemen Presensi & GPS</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
          <MapPin className="w-7 h-7 text-blue-600" />
          <span>Lokasi Kerja & Titik Presensi</span>
        </h1>
        <p className="text-sm text-slate-500">
          Tentukan titik koordinat GPS dan foto area untuk verifikasi presensi lapangan pekerja.
        </p>
      </div>

      {/* Grid Konten */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Panel Kiri: Daftar Pekerjaan */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <Briefcase className="w-4 h-4 text-blue-600" />
              <span>Daftar Pekerjaan</span>
            </h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
              {listPekerjaan.length} Proyek
            </span>
          </div>

          <div className="space-y-2">
            {listPekerjaan.map(pj => {
              const isSelected = selectedId === pj.id_pekerjaan;
              return (
                <button
                  key={pj.id_pekerjaan}
                  type="button"
                  onClick={() => handlePilihPekerjaan(pj.id_pekerjaan)}
                  className={`w-full text-left p-3.5 rounded-xl border transition flex flex-col space-y-1.5 ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-400 shadow-xs ring-1 ring-blue-400'
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-xs font-bold ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                      {pj.nama_pekerjaan}
                    </span>
                    {pj.latitude ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 shrink-0">
                        GPS Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 shrink-0">
                        Belum Ada
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 text-[11px] text-slate-500">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {pj.latitude ? `${pj.latitude}, ${pj.longitude}` : 'Koordinat belum disetel'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel Kanan: Form Detail Lokasi */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base flex items-center space-x-2">
                <Navigation className="w-4 h-4 text-blue-600" />
                <span>Detail Titik Lokasi</span>
              </h3>
              {selectedPekerjaan && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Proyek aktif: <strong className="text-slate-700">{selectedPekerjaan.nama_pekerjaan}</strong>
                </p>
              )}
            </div>
          </div>

          {!selectedPekerjaan ? (
            <div className="p-10 text-center text-slate-400">
              <Briefcase className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Pilih pekerjaan terlebih dahulu di panel sebelah kiri.</p>
            </div>
          ) : (
            <form onSubmit={handleSimpan} className="space-y-4">
              {/* Notifikasi */}
              {pesan && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center space-x-2 text-xs font-semibold ${
                    pesan.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}
                >
                  {pesan.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{pesan.text}</span>
                </div>
              )}

              {/* Koordinat GPS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="latitude" className="block text-xs font-semibold text-slate-700 mb-1">
                    Latitude <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="latitude"
                    name="latitude"
                    type="text"
                    placeholder="Contoh: -6.914744"
                    value={form.latitude}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label htmlFor="longitude" className="block text-xs font-semibold text-slate-700 mb-1">
                    Longitude <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="longitude"
                    name="longitude"
                    type="text"
                    placeholder="Contoh: 107.609810"
                    value={form.longitude}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Tombol Buka Maps */}
              {form.latitude && form.longitude && (
                <div>
                  <button
                    type="button"
                    onClick={handleLihatPeta}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                    <span>Lihat Lokasi di Google Maps</span>
                  </button>
                </div>
              )}

              {/* Upload Foto Lokasi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Foto Area Lokasi Kerja
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/20 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center cursor-pointer transition min-h-[140px]"
                >
                  {form.fotoPreview ? (
                    <div className="w-full relative">
                      <img
                        src={form.fotoPreview}
                        alt="Preview lokasi"
                        className="w-full max-h-48 object-cover rounded-xl border border-slate-200"
                      />
                    </div>
                  ) : (
                    <div className="text-center space-y-1">
                      <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-semibold text-slate-700">Klik untuk unggah foto lokasi</p>
                      <p className="text-[11px] text-slate-400">JPG, PNG, atau WebP (maks. 5MB)</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFoto}
                  id="input-foto-lokasi"
                />
                {form.fotoPreview && (
                  <button
                    type="button"
                    onClick={handleHapusFoto}
                    className="mt-2 inline-flex items-center space-x-1 px-2.5 py-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Foto Lokasi</span>
                  </button>
                )}
              </div>

              {/* Info Tambahan */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-600 space-y-2">
                <div className="flex items-center space-x-2">
                  <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>
                    <strong>Shift Kerja:</strong> {selectedPekerjaan.shift_mulai} – {selectedPekerjaan.shift_selesai}
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    <strong>Deskripsi:</strong> {selectedPekerjaan.deskripsi}
                  </span>
                </div>
              </div>

              {/* Tombol Simpan */}
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-md hover:shadow-lg transition flex items-center justify-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Titik Lokasi Kerja</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
