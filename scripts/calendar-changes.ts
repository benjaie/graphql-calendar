import { execFileSync } from 'node:child_process'
import { lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import yaml from 'js-yaml'

// Leave headroom under the Linux per-environment-variable limit on the publisher.
const maxBytes = 100_000

function checkPath(path: unknown): asserts path is string {
  if (typeof path !== 'string' || !path.startsWith('calendar/') || !/\.ya?ml$/.test(path) || /[\\\x00-\x1f]/.test(path)) throw Error('Expected a calendar YAML path')
  const parts = path.split('/')
  let prefix = ''
  for (const part of parts) {
    if (!part || part === '.' || part === '..' || part.toLowerCase() === '.git') throw Error('Invalid calendar path')
    prefix = prefix ? prefix + '/' + part : part
    const stat = lstatSync(prefix, { throwIfNoEntry: false })
    if (stat && !(prefix === path ? stat.isFile() : stat.isDirectory())) throw Error('Expected regular files and directories')
  }
}

function propose() {
  const files = execFileSync('git', ['ls-files', '--modified', '--others', '--exclude-standard', '--deduplicate', '-z', '--', 'calendar/'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
  const changes = files
    .filter((path) => /\.ya?ml$/.test(path))
    .map((path) => {
      checkPath(path)
      return { path, contents: lstatSync(path, { throwIfNoEntry: false }) ? readFileSync(path, 'utf8') : null }
    })
  const manifest = JSON.stringify(changes)
  if (Buffer.byteLength(manifest) > maxBytes) throw Error('Calendar changes exceed the job output limit')
  return manifest
}

export function applyChanges(manifest: string) {
  if (Buffer.byteLength(manifest) > maxBytes) throw Error('Calendar changes exceed the job output limit')
  const changes: unknown = JSON.parse(manifest)
  if (!Array.isArray(changes)) throw Error('Expected a list of calendar changes')
  const seen = new Set<string>()
  for (const change of changes) {
    const { path, contents } = change
    checkPath(path)
    if (seen.has(path)) throw Error('Duplicate calendar path')
    seen.add(path)
    if (contents !== null) {
      if (typeof contents !== 'string') throw Error('Expected YAML text')
      yaml.load(contents)
    }
  }
  for (const { path, contents } of changes) {
    if (contents === null) rmSync(path)
    else {
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, contents)
    }
  }
}

if (process.argv[2] === 'propose') console.log(propose())
if (process.argv[2] === 'apply') applyChanges(process.env.CALENDAR_CHANGES ?? '')
