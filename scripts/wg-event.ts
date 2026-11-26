export function localTime(instant: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(instant))
  const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` }
}

type Item = { title: string; process?: boolean; subitems?: Item[] }
export function contributions(items: Item[], template: Item[]): string[] {
  return items.flatMap((item) => {
    const match = template.find((t) => t.title.toLowerCase() === item.title.toLowerCase())
    const children = contributions(item.subitems ?? [], match?.subitems ?? [])
    if ((match || item.process) && !children.length) return []
    return [item.title, ...children.map((child) => '  ' + child)]
  })
}

export function tentative(topics: boolean, participants: boolean) {
  if (topics && participants) return ''
  const missing = [!topics && 'contributed agenda topics', !participants && 'signed-up participants'].filter(Boolean).join(' or ')
  return `This meeting has no ${missing} yet and may not go ahead. If you are interested, add yourself to the agenda and join the meeting. Seeing your name is likely to encourage others to sign up too. If nobody turns up within five minutes of the start time, assume the meeting will not proceed.`
}
