# bang-run

A Claude Code mod. When Claude suggests a shell command as a `! command` line in a code block, this adds a `▶ Run` button under that block. One click runs the command in your login shell (`$SHELL -l`) in the session's working directory and sends the command, exit code and output back to Claude as a message.

## Install

At the prompt of a Claude Code terminal session:

    /plugin install bang-run --marketplace minhnhut/claude-bang-run

Answer `y` to add the marketplace, then pick a scope.

From a shell:

    claude plugin install bang-run --marketplace minhnhut/claude-bang-run

## Run from a folder instead

Clone this repository, then load it for one session:

    claude --plugin-dir /path/to/claude-bang-run

## Notes

- One click runs the command immediately. Read it before clicking.
- The command has no terminal attached, so anything that asks for input will hang and time out after 5 minutes.
- Output sent to Claude is cut at 20,000 characters.
- Runs in the shell named by `$SHELL`, or `/bin/sh` where that is unset (macOS, Linux). It will not work on Windows as is.
- Built against Claude Code 2.1.323. The mod API is early access and may change.
