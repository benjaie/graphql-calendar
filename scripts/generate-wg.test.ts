import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync, globSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import assert from 'node:assert/strict'
import test from 'node:test'
import yaml from 'js-yaml'

test('refreshes nested agendas, preserves events on import failure, and reconciles cancellations', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'wg-import-test-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const root = resolve(import.meta.dirname, '..')
  cpSync(join(root, 'scripts'), join(dir, 'scripts'), { recursive: true })
  cpSync(join(root, 'package.json'), join(dir, 'package.json'))
  symlinkSync(join(root, 'node_modules'), join(dir, 'node_modules'), 'dir')
  const upstream = join(dir, 'upstream')
  const empty = join(dir, 'empty')
  const env = { ...process.env, GIT_CONFIG_GLOBAL: join(dir, 'gitconfig'), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_COUNT: '0' }
  const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { env, cwd, stdio: 'pipe' })
  const publish = (cwd: string) => {
    git(cwd, 'add', '.')
    git(cwd, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.org', 'commit', '-qm', 'fixture')
  }
  git(dir, 'config', '--global', `url.file://${upstream}.insteadOf`, 'https://github.com/graphql/graphql-over-http.git')
  for (const repo of [
    'graphql-wg',
    'graphql-js-wg',
    'graphiql',
    'ai-wg',
    'community-wg',
    'composite-schemas-wg',
    'defer-stream-wg',
    'golden-path-wg',
    'nullability-wg',
    'otel-wg',
  ]) {
    git(dir, 'config', '--global', '--add', `url.file://${empty}.insteadOf`, `https://github.com/graphql/${repo}.git`)
  }
  for (const cwd of [empty, upstream]) {
    mkdirSync(join(cwd, 'working-group/agendas'), { recursive: true })
    git(cwd, 'init', '-qb', 'main')
    writeFileSync(join(cwd, 'package.json'), '{"type":"commonjs"}')
    writeFileSync(join(cwd, 'working-group/agendas/.gitkeep'), '')
    writeFileSync(
      join(cwd, 'wg.config.js'),
      'module.exports=' +
        JSON.stringify({
          name: 'Test WG',
          repoUrl: 'https://github.com/graphql/graphql-over-http',
          repoSubpath: 'working-group',
          time: '10:00-11:00',
          nth: 1,
          weekday: 'Th',
          frequency: 'monthly',
          timezone: 'UTC',
          videoConferenceDetails: 'Test',
          attendeesTemplate: '| Name | GitHub | Organization | Location |\n| --- | --- | --- | --- |\n| Host | @host | | |',
        }),
    )
    publish(cwd)
  }
  const month = new Date()
  month.setUTCDate(1)
  month.setUTCMonth(month.getUTCMonth() + 1)
  const date = month.toISOString().slice(0, 10)
  const file = join(upstream, 'working-group/agendas/meeting.md')
  const agenda = `# Fixture meeting\n\nhttps://www.timeanddate.com/worldclock/converter.html?iso=${date.replaceAll('-', '')}T100000&p1=0\n\n## Attendees\n\n| Name | GitHub | Organization | Location |\n| --- | --- | --- | --- |\n| Host | @HOST | | |\n\n## Agenda\n\n1. A new topic\n`
  const run = () => execFileSync(process.execPath, ['scripts/generate-wg.ts'], { cwd: dir, env, stdio: 'pipe' })
  writeFileSync(file, agenda)
  publish(upstream)
  run()
  const [event] = globSync('calendar/*/*.yaml', { cwd: dir })
  const read = () => readFileSync(join(dir, event), 'utf8')
  const before = read()
  const parsed = yaml.load(before) as Record<string, string>
  assert.equal(parsed.title, 'TBC: Fixture meeting')
  assert.equal(parsed.endUtc, date + 'T11:00:00.000Z')
  assert.match(parsed.description, /no signed-up participants/)
  assert.match(parsed.location, /working-group\/agendas\/meeting.md$/)
  writeFileSync(file, '# Missing start')
  publish(upstream)
  assert.throws(run, /Previously imported agenda/)
  assert.equal(read(), before)
  writeFileSync(file, 'Meeting cancelled.')
  publish(upstream)
  run()
  assert.deepEqual(globSync('calendar/*/*.yaml', { cwd: dir }), [])
  writeFileSync(file, agenda)
  publish(upstream)
  run()
  assert.equal(read(), before)
  rmSync(file)
  publish(upstream)
  run()
  assert.deepEqual(globSync('calendar/*/*.yaml', { cwd: dir }), [])
})
