/**
 * Utilitas sinkronisasi waktu otoritatif berbasis NTP (Server PHP -> UDP NTP Pool).
 * Offset dihitung terhadap `performance.now()` (timer monotonik peramban), sehingga
 * perubahan jam sistem pada laptop/HP klien tidak memengaruhi jam & tanggal absensi.
 */

const NTP_ENDPOINTS = [
  '/api/auth.php?action=ntp_time',
  '/api/absensi.php?action=ntp_time',
]

const JAKARTA_PARTS_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

const JAKARTA_PREVIEW_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

let syncState = {
  synced: false,
  syncedEpochMs: null,
  syncedPerfMs: null,
  source: 'unsynced', // 'ntp' | 'server_fallback' | 'unsynced'
  ntpServer: null,
  lastSyncedPerfMs: 0,
}

let inFlightSync = null
const listeners = new Set()

function notifyListeners() {
  const snapshot = getNtpSyncState()
  listeners.forEach((fn) => {
    try {
      fn(snapshot)
    } catch {
      // Abaikan error listener individual
    }
  })
}

export function getNtpSyncState() {
  return {
    synced: syncState.synced,
    source: syncState.source,
    ntpServer: syncState.ntpServer,
  }
}

export function subscribeNtpSync(listener) {
  if (typeof listener !== 'function') return () => {}
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function syncNtpTime({ force = false, maxAgeMs = 60_000 } = {}) {
  const perfNow = typeof performance !== 'undefined' ? performance.now() : Date.now()
  if (
    !force &&
    syncState.synced &&
    syncState.syncedEpochMs !== null &&
    perfNow - syncState.lastSyncedPerfMs < maxAgeMs
  ) {
    return getNtpSyncState()
  }

  if (inFlightSync) {
    return inFlightSync
  }

  inFlightSync = (async () => {
    for (const url of NTP_ENDPOINTS) {
      try {
        const reqStart = typeof performance !== 'undefined' ? performance.now() : Date.now()
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        })
        const reqEnd = typeof performance !== 'undefined' ? performance.now() : Date.now()

        if (!response.ok) continue
        const payload = await response.json()
        const data = payload?.data
        const epochMs = Number(data?.epoch_ms)

        if (payload?.success && Number.isFinite(epochMs) && epochMs > 1700000000000) {
          const midPerf = reqStart + (reqEnd - reqStart) / 2
          syncState = {
            synced: true,
            syncedEpochMs: epochMs,
            syncedPerfMs: midPerf,
            source: data?.source || 'ntp',
            ntpServer: data?.ntp_server || null,
            lastSyncedPerfMs: reqEnd,
          }
          notifyListeners()
          return getNtpSyncState()
        }
      } catch {
        // Coba endpoint berikutnya
      }
    }
    return getNtpSyncState()
  })().finally(() => {
    inFlightSync = null
  })

  return inFlightSync
}

/**
 * Mengembalikan objek Date berdasarkan waktu NTP tersinkronisasi + elapsed monotonic browser.
 * Hanya jatuh ke `new Date()` jika sinkronisasi ke backend belum pernah berhasil.
 */
export function getSyncedNowDate() {
  if (syncState.syncedEpochMs !== null && syncState.syncedPerfMs !== null) {
    const perfNow = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const elapsed = Math.max(0, perfNow - syncState.syncedPerfMs)
    return new Date(syncState.syncedEpochMs + elapsed)
  }
  return new Date()
}

export function getSyncedJakartaNow() {
  const now = getSyncedNowDate()
  const parts = JAKARTA_PARTS_FORMATTER.formatToParts(now).reduce((acc, p) => {
    acc[p.type] = p.value
    return acc
  }, {})

  const tanggal = `${parts.year}-${parts.month}-${parts.day}`
  const jam = `${parts.hour}:${parts.minute}:${parts.second}`

  return {
    date: now,
    tanggal,
    jam,
    jamMenit: `${parts.hour}:${parts.minute}`,
    periode: `${parts.year}-${parts.month}`,
    previewLabel: JAKARTA_PREVIEW_FORMATTER.format(now),
    synced: syncState.synced,
    source: syncState.source,
    ntpServer: syncState.ntpServer,
  }
}

