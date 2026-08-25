-- Keymaps for nvim running inside a herdr popup.
--
-- The popup is a viewport onto a per-worktree nvim server, so leaving detaches
-- the UI rather than quitting: buffers, marks, and undo are still there next
-- time. `<leader>s` sends a selection to the agent in the pane underneath,
-- without closing anything.

local M = {}

-- The popup has no pane id of its own; herdr_nvim forwards the id of the tiled
-- pane it was opened over, which is where the agent lives.
local function host_pane()
  return vim.env.HERDR_HOST_PANE_ID
end

local function herdr(...)
  local bin = vim.env.HERDR_BIN_PATH
  if bin == nil or bin == "" then
    bin = "herdr"
  end

  return vim.system({ bin, ... }):wait()
end

-- Detaching leaves the server running. Reopening the popup reattaches to this
-- same session.
local function detach()
  vim.cmd("detach")
end

-- Buffer-local so it survives plugins that map `q` themselves (a dashboard,
-- a quickfix list), which is why it re-applies on every BufEnter.
local function set_close_mappings()
  vim.keymap.set("n", "q", detach, { buffer = 0, desc = "herdr: close popup" })
  vim.keymap.set("n", "Q", "q", { buffer = 0, desc = "Record macro (moved from q)" })
end

local function selected_lines()
  local mode = vim.fn.visualmode()
  local from, to = vim.fn.getpos("'<"), vim.fn.getpos("'>")
  local lines = vim.api.nvim_buf_get_lines(0, from[2] - 1, to[2], false)
  if #lines == 0 then
    return nil
  end

  if mode == "v" then
    -- A linewise-to-end selection reports a sentinel column, so clamp it to
    -- the real line length.
    local last = to[3] == 2147483647 and #lines[#lines] or to[3]
    if #lines == 1 then
      lines[1] = lines[1]:sub(from[3], last)
    else
      lines[1] = lines[1]:sub(from[3])
      lines[#lines] = lines[#lines]:sub(1, last)
    end
  elseif mode == "\22" then
    local first, last = from[3], to[3]
    if first > last then
      first, last = last, first
    end
    for i, line in ipairs(lines) do
      lines[i] = line:sub(first, last)
    end
  end

  return lines, from[2], to[2]
end

local function relative_path()
  local absolute = vim.fn.expand("%:p")
  local root = vim.fn.systemlist("git rev-parse --show-toplevel")[1]
  if root and root ~= "" and absolute:sub(1, #root) == root then
    return absolute:sub(#root + 2)
  end
  return absolute
end

-- Goes through `agent prompt` rather than `pane send-text`: only the agent
-- path honours bracketed paste, and a multi-line selection sent as raw text
-- would submit one line at a time.
--
-- It also resolves the live agent, so it fails loudly when the pane no longer
-- holds one instead of typing into whatever took its place.
function M.send_selection()
  local lines, first, last = selected_lines()
  if not lines then
    return
  end

  local header = ("file: %s:L%d-L%d\ncontent:\n"):format(relative_path(), first, last)
  local result = herdr("agent", "prompt", host_pane(), header .. table.concat(lines, "\n") .. "\n")

  if result.code ~= 0 or (result.stdout or ""):match('"error"') then
    vim.notify("herdr: no agent in the pane below", vim.log.levels.WARN)
  end
end

set_close_mappings()
vim.api.nvim_create_autocmd("BufEnter", { callback = set_close_mappings })

vim.keymap.set("n", "<C-z>", detach, { desc = "herdr: close popup" })

vim.keymap.set("v", "<leader>s", function()
  -- Leave visual mode first so the '< and '> marks are set.
  vim.cmd('execute "normal! \\<esc>"')
  M.send_selection()
end, { silent = true, desc = "herdr: send selection to agent" })

vim.keymap.set("n", "<A-d>", function()
  detach()
  herdr("plugin", "action", "invoke", "toggle", "--plugin", "persiyanov.reviewr")
end, { desc = "herdr: review diff" })

return M
