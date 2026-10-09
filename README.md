# tmux-status-dots

See what Claude Code is doing in each tmux window, at a glance.

- 🟢 **working**
- 🟡 **waiting** on you (a permission prompt or a question)
- ⚪ **idle**
- 🔴 **error** (the turn ended with an error)

<br>

## What it changes, and why

It only does two things. Nothing else on your system is touched.

**1. Three tmux window options** on the window Claude runs in:

| Option | Value | Why |
|---|---|---|
| `@claude_state` | `working`, `input`, `idle`, `error` | For your own scripts and formats. |
| `@claude_dot` | a colored `●` | Drop it into your tmux bar. |
| `@claude_label` | `working`, `waiting`, `idle` | Only in one-line mode, for the tab title. |

These do nothing on their own. Your tmux bar only changes if you add them to it (see below).

**2. The iTerm2 tab dot** (only when tmux runs inside iTerm2):

- It sets the colored dot and status text on the iTerm2 tab, using `it2`, the tool iTerm2 ships with.
- Why: iTerm2's own Claude add-on can't find the right tab from inside tmux, so its dot never updates there.
- It finds the tab by matching tmux's terminal to iTerm2's tab list.
- You can turn this off (see Settings).

Outside tmux, it does nothing.

<br>

## Settings

You're asked these when you install. Change them later in `/config`.

- **iTerm2 tab dot** (on/off): show the dot on the iTerm2 tab.
- **iTerm2 tab layout**:
  - `two-line`: the task on top, the state under it.
  - `one-line`: `Fix login: working` on one line. Needs the title line below.

<br>

## Add the dot to your tmux bar (optional)

In `~/.tmux.conf` (or `~/.config/tmux/tmux.conf`), put `#{@claude_dot}` where you want it, for example:

```tmux
set -g window-status-format " #I #{?@claude_dot,#{E:@claude_dot} ,}#W "
set -g window-status-current-format " #I #{?@claude_dot,#{E:@claude_dot} ,}#W "
```

For **one-line** mode, let tmux set the iTerm2 tab title, with the state after it:

```tmux
set -g set-titles on
set -g set-titles-string "#T#{?@claude_label,: #{@claude_label},}"
```

Then reload tmux: `tmux source-file ~/.tmux.conf`

<br>

## Needs

- tmux (tested on 3.8).
- For the tab dot: iTerm2 with the `it2` tool (tested on 3.7.4). `it2` talks to iTerm2 through its API, so turn on Settings > General > Magic > Enable Python API.

<br>

## Install

At the prompt of a Claude Code session, type:

```
/plugin install tmux-status-dots --marketplace NeonOrchard/tmux-status-dots
```

Then:

- Press `y` to add the marketplace.
- Pick a scope (user scope is first; press **Enter**).

That's it. It works right away, no restart.

<br>

## License

MIT. See [LICENSE](LICENSE).
