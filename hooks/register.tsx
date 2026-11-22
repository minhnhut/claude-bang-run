import type { EngineInterface, Register } from 'claude-code'

type Part = { text: string; cmds: string[] }

/** A reply's text cut after each fenced block that holds `!` lines, so a button can follow that block. */
export function parts(text: string): Part[] {
  const out: Part[] = []
  let lines: string[] = []
  let cmds: string[] = []
  let inFence = false
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    lines.push(line)
    if (trimmed.startsWith('```')) {
      if (inFence && cmds.length > 0) {
        out.push({ text: lines.join('\n'), cmds })
        lines = []
        cmds = []
      }
      inFence = !inFence
      continue
    }
    if (inFence) {
      const m = /^!\s*(\S.*)$/.exec(trimmed)
      const cmd = m?.[1]?.trim()
      if (cmd !== undefined && cmd.length <= 2000 && !/<[a-z-]+>/i.test(cmd)) {
        cmds.push(cmd)
      }
    }
  }
  if (out.length === 0) {
    return []
  }
  if (lines.join('').trim() !== '') {
    out.push({ text: lines.join('\n'), cmds: [] })
  }
  return out
}

const short = (cmd: string) => (cmd.length > 72 ? `${cmd.slice(0, 71)}…` : cmd)

const LIMIT = 20000
const clip = (out: string) => (out.length > LIMIT ? `${out.slice(0, LIMIT)}\n… [output cut at ${LIMIT} characters]` : out)
const running = new Set<string>()

/** Runs one suggested command in the user's login shell and hands the result to Claude as a prompt. */
async function run($: EngineInterface, cmd: string): Promise<void> {
  if (running.has(cmd)) {
    return
  }
  running.add(cmd)
  $.ui.status(`▶ running: ${short(cmd)}`)
  try {
    // The user's own login shell ($SHELL), or sh where that is unset; the command travels as an argument, never spliced into the script.
    const r = await $.process.run(['/bin/sh', '-c', 'exec "${SHELL:-/bin/sh}" -lc "$1"', 'sh', cmd], { timeoutMs: 300000 })
    const out = [r.stdout.trimEnd(), r.stderr.trimEnd()].filter(part => part !== '').join('\n')
    const fence = '`'.repeat(3)
    await $.prompt.submit({
      text: `I ran the command you suggested: \`${cmd}\` (exit code ${r.exitCode})\n\n${fence}\n${clip(out) || '(no output)'}\n${fence}`,
    })
  } catch {
    $.ui.toast(`Could not run: ${short(cmd)} (it did not start, or ran past 5 minutes)`)
  } finally {
    running.delete(cmd)
    $.ui.status(undefined)
  }
}

export const register: Register = on => {
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const cut = parts(e.props.text)

    if (cut.length === 0) {
      return next(e)
    }

    const { Box, Button, Text } = $.ui.resolve(e)
    const rows = []
    for (const [i, part] of cut.entries()) {
      rows.push(
        await next({
          ...e,
          props: { ...e.props, text: part.text, isFirstOfReply: e.props.isFirstOfReply && i === 0 },
        }),
      )
      for (const [j, cmd] of part.cmds.entries()) {
        rows.push(
          <Box key={`run-row-${i}-${j}`}>
            <Text>  </Text>
            <Button
              key={`run-${i}-${j}`}
              label={part.cmds.length > 1 ? `▶ Run: ${short(cmd)}` : '▶ Run'}
              onPress={() => void run($, cmd)}
            />
          </Box>,
        )
      }
    }

    return <Box flexDirection="column">{rows}</Box>
  })
}
