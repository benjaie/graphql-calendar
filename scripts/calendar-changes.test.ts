import assert from 'node:assert/strict'
import { memfs } from 'memfs'
import test from 'node:test'
import { applyChanges } from './calendar-changes.ts'

test('applies YAML edits and deletions only within the calendar tree', () => {
  const { fs } = memfs({})
  const path = 'calendar/manual.yaml'
  const apply = (path: string, contents: string | null) => applyChanges(JSON.stringify([{ path, contents }]), fs)
  apply(path, 'title: Original')
  apply(path, 'title: Updated')
  assert.equal(fs.readFileSync(path, 'utf8'), 'title: Updated')
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
