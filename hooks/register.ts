import type { EngineInterface, PluginOptions, Register } from 'claude-code'

// What this mod touches, and nothing else (see README.md):
// 1. Two tmux window options on the window Claude runs in:
//    @claude_state (working | input | idle | error), @claude_dot (a colored ●)
//    and @claude_label (the word iTerm2 shows: working | waiting | idle | error).
//    They show nothing until you put #{@claude_dot} in your own tmux status format.
// 2. When tmux runs inside iTerm2, the iTerm2 tab's status dot and text,
//    set through iTerm2's own it2 tool (the same one iTerm2's Claude add-on uses).

type ClaudeState = 'working' | 'input' | 'idle' | 'error'

const COLORS: Record<ClaudeState, string> = {
  working: '#9ed090',
  input: '#e2ca9a',
  idle: '#868da9',
  error: '#e18291',
}

// iTerm2's status text only knows these three words.
const ITERM_STATUS: Record<ClaudeState, string> = {
  working: 'working',
  input: 'waiting',
  idle: 'idle',
  error: 'idle',
}

const IT2 = '/Applications/iTerm.app/Contents/Resources/utilities/it2'

async function tmuxGet($: EngineInterface, pane: string, format: string): Promise<string> {
  const out = await $.process.run(['tmux', 'display-message', '-p', '-t', pane, format]).catch(() => undefined)
  return out?.exitCode === 0 ? out.stdout.trim() : ''
}

// Finds the iTerm2 tab tmux is drawn in by matching tmux's terminal (tty) to iTerm2's tab list.
async function itermTab($: EngineInterface, pane: string): Promise<string | undefined> {
  if (!(await tmuxGet($, pane, '#{client_termtype}')).includes('iTerm')) return undefined
  const tty = await tmuxGet($, pane, '#{client_tty}')
  if (!tty) return undefined
  const list = await $.process.run([IT2, 'session', 'list']).catch(() => undefined)
  if (list?.exitCode !== 0) return undefined
  const row = list.stdout
    .split('\n')
    .map(line => line.split('\t'))
    .find(cols => (cols[cols.length - 1] ?? '').replaceAll('\\', '') === tty)
  return row?.[0]
}

async function setState($: EngineInterface, options: PluginOptions, state: ClaudeState | undefined): Promise<void> {
  const pane = await $.env.get('TMUX_PANE')
  if (!pane) return

  const opts = state
    ? [
        ['tmux', 'set-option', '-w', '-t', pane, '@claude_state', state],
        ['tmux', 'set-option', '-w', '-t', pane, '@claude_dot', `#[fg=${COLORS[state]}]●#[fg=default]`],
        // Only one-line mode puts the word in the title; two-line shows it under the title instead.
        options.itermLayout === 'one-line'
          ? ['tmux', 'set-option', '-w', '-t', pane, '@claude_label', state === 'error' ? 'error' : ITERM_STATUS[state]]
          : ['tmux', 'set-option', '-w', '-u', '-t', pane, '@claude_label'],
      ]
    : [
        ['tmux', 'set-option', '-w', '-u', '-t', pane, '@claude_state'],
        ['tmux', 'set-option', '-w', '-u', '-t', pane, '@claude_dot'],
        ['tmux', 'set-option', '-w', '-u', '-t', pane, '@claude_label'],
      ]
  for (const argv of opts) await $.process.run(argv).catch(() => undefined)

  if (options.itermDot === false) return
  const tab = await itermTab($, pane)
  if (!tab) return
  const s = state ?? 'idle'
  // One-line: no text under the title; the word rides in the title via #{@claude_label}.
  const text = options.itermLayout === 'one-line' ? '' : ITERM_STATUS[s]
  const argv = [IT2, 'session', 'set-status', '--session', tab, '--status', text, '--dot-color', COLORS[s]]
  await $.process.run(s === 'error' && text ? [...argv, '--detail', 'error'] : argv).catch(() => undefined)
}

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    const out = await next(e)
    if ((await $.env.get('TMUX_PANE')) && !(await $.store.get('noticeShown'))) {
      $.ui.toast('tmux-status-dots: shows Claude\'s state on this tmux window and its iTerm2 tab. README explains what it changes.')
      await $.store.set('noticeShown', true)
    }
    await setState($, options, 'idle')
    return out
  })

  on('turn.start', async ($, e, next) => {
    await setState($, options, 'working')
    return next(e)
  })

  // The engine is about to show a permission prompt: waiting on the person.
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)
    if (verdict.decision === 'ask') await setState($, options, 'input')
    return verdict
  })

  on('tool.call', async ($, e, next) => {
    if (e.tool === 'AskUserQuestion') await setState($, options, 'input')
    const out = await next(e)
    await setState($, options, 'working')
    return out
  })

  on('turn.complete', async ($, e, next) => {
    const out = await next(e)
    if (e.agentId === undefined) await setState($, options, e.reason === 'error' || e.reason === 'refusal' ? 'error' : 'idle')
    return out
  })

  on('session.end', async ($, e, next) => {
    await setState($, options, undefined)
    return next(e)
  })
}
