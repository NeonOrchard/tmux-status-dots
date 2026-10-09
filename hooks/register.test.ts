import { expect, test } from 'claude-code/testing'

test('a turn shows working, then idle', async ($, on) => {
  const states: string[] = []
  on('env.get', () => ({ value: '%7' }))
  on('process.run', (_$, e) => {
    if (e.argv[5] === '@claude_state') states.push(e.argv[6] ?? '')
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))

  await $.turn.start({ text: 'hi', turnId: 't1' })
  await $.turn.complete({ answer: 'ok', durationMs: 5, isAborted: false, turnId: 't1', reason: 'answer' })

  expect(states).toEqual(['working', 'idle'])
})
