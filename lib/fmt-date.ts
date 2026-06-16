const TZ = 'America/Chicago'

export function fmtDateTime(ts: string | Date): string {
  return new Date(ts).toLocaleString('en-US', { timeZone: TZ })
}

export function fmtDate(ts: string | Date): string {
  return new Date(ts).toLocaleDateString('en-US', { timeZone: TZ })
}

export function fmtTime(ts: string | Date): string {
  return new Date(ts).toLocaleTimeString('en-US', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
}

export function fmtDayHeader(ts: string | Date): string {
  return new Date(ts).toLocaleDateString('en-US', {
    timeZone: TZ, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

export function fmtTodayHeader(): string {
  return new Date().toLocaleDateString('en-US', {
    timeZone: TZ, weekday: 'long', month: 'long', day: 'numeric',
  })
}
