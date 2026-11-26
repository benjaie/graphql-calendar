import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { parseEvent } from './sync.ts'

test('rejects an impossible UTC date even when it normalizes to the event day', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'calendar-utc-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const file = join(dir, 'event.yaml')
  const event = {
    startTime: '10:00',
    endTime: '11:00',
    timeZone: 'UTC',
    type: 'meeting',
    title: 'Test',
    location: 'Online',
    description: 'Test',
    link: 'https://example.org',
    startUtc: '2027-03-01T10:00:00.000Z',
    endUtc: '2027-03-01T11:00:00.000Z',
  }
  const parse = () => {
    writeFileSync(file, JSON.stringify(event))
    return parseEvent(file, 'calendar/2027/03-01-test.yaml')
  }
  assert.ok(!('errors' in parse()))
  event.startUtc = '2027-02-29T10:00:00.000Z'
  const result = parse()
  assert.ok('errors' in result && result.errors.some((message) => message.includes('UTC ISO timestamps')))
})
