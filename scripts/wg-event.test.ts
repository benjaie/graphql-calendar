import assert from 'node:assert/strict'
import test from 'node:test'
import { contributions, localTime, tentative } from './wg-event.ts'

test('contributed children of a template heading survive', () => {
  const template = [{ title: 'Annual reminder', subitems: [{ title: 'Election timeline' }] }]
  assert.deepEqual(contributions([{ title: 'Annual reminder', subitems: [{ title: 'Election timeline' }, { title: 'New proposal' }] }], template), [
    'Annual reminder',
    '  New proposal',
  ])
  assert.deepEqual(contributions(template, template), [])
})
test('tentative notices identify each missing contribution', () => {
  assert.equal(tentative(true, true), '')
  assert.match(tentative(true, false), /no signed-up participants/)
  assert.match(tentative(false, true), /no contributed agenda topics yet/)
  assert.match(tentative(false, false), /topics or signed-up participants/)
})
test('local times across midnight and the autumn fold', () => {
  assert.deepEqual(localTime('2027-01-01T01:00:00Z', 'US/Pacific'), { date: '2026-12-31', time: '17:00' })
  assert.deepEqual(localTime('2026-11-01T08:30:00Z', 'US/Pacific'), localTime('2026-11-01T09:30:00Z', 'US/Pacific'))
})
