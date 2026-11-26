import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, existsSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { applyChanges } from './calendar-changes.ts'

test('applies YAML edits and deletions only within the calendar tree', (t) => {
  const cwd = process.cwd()
  const dir = mkdtempSync(join(tmpdir(), 'calendar-changes-'))
  process.chdir(dir)
  t.after(() => {
    process.chdir(cwd)
    rmSync(dir, { recursive: true, force: true })
  })
  const path = 'calendar/manual.yaml'
  const apply = (path: string, contents: string | null) => applyChanges(JSON.stringify([{ path, contents }]))
  apply(path, 'title: Original')
  apply(path, 'title: Updated')
  assert.equal(readFileSync(path, 'utf8'), 'title: Updated')
  mkdirSync('outside')
  symlinkSync('../outside', 'calendar/linked')
  for (const invalid of ['README.md', 'calendar/../outside/a.yaml', 'calendar/linked/a.yaml', 'calendar/a.ts']) {
    assert.throws(() => apply(invalid, '{}'))
  }
  assert.throws(() => apply(path, '[invalid'))
  assert.equal(readFileSync(path, 'utf8'), 'title: Updated')
  apply(path, null)
  assert.equal(existsSync(path), false)
})
