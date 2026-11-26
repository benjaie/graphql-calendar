import assert from 'node:assert/strict'
import { memfs } from 'memfs'
import test from 'node:test'
import { applyChanges } from './calendar-changes.ts'

test('applies YAML edits and deletions only within the calendar tree', () => {
  const { fs } = memfs({})
  const path = 'calendar/WG_2027/01-02-Meeting_Notes.yaml'
  const apply = (path: string, contents: string | null) => applyChanges(JSON.stringify([{ path, contents }]), fs)
  apply(path, 'title: Original')
  apply(path, 'title: Updated')
  assert.equal(fs.readFileSync(path, 'utf8'), 'title: Updated')
  const shortPath = 'calendar/meeting.yml'
  apply(shortPath, 'title: Meeting')
  assert.equal(fs.readFileSync(shortPath, 'utf8'), 'title: Meeting')
  apply(shortPath, null)
  assert.equal(fs.existsSync(shortPath), false)
  fs.mkdirSync('outside')
  fs.symlinkSync('../outside', 'calendar/linked')
  for (const invalid of ['README.md', 'calendar/../outside/a.yaml', 'calendar/linked/a.yaml', 'calendar/a.ts']) {
    assert.throws(() => apply(invalid, '{}'))
  }
  assert.throws(() => apply(path, '[invalid'))
  assert.equal(fs.readFileSync(path, 'utf8'), 'title: Updated')
  apply(path, null)
  assert.equal(fs.existsSync(path), false)
})

test('rejects invalid path components and suffixes for writes and deletions', () => {
  const { fs } = memfs({})
  for (const path of [
    'calendar/.hidden/file.yaml',
    'calendar/2027/.hidden.yaml',
    'calendar/.yaml',
    'calendar/a.YAML',
    'calendar/wg.old/a.yaml',
    'calendar/a.b.yaml',
    'calendar/a.YML',
    'calendar//a.yaml',
    'calendar/a b.yaml',
    'calendar/a.yaml\n',
    'calendar/é.yaml',
  ]) {
    for (const contents of ['{}', null]) {
      assert.throws(() => applyChanges(JSON.stringify([{ path, contents }]), fs), /Invalid calendar path/, path)
    }
  }
})
