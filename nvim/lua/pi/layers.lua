-- Pi Layers integration
-- Loaded by pi/init.lua when PI_LAYER_ACTION_FILE is set

local action_file = vim.env.PI_LAYER_ACTION_FILE

local function current_file_context()
  return {
    file = vim.fn.expand("%:p"),
    line = vim.fn.line("."),
  }
end

local function write_action(data)
  -- Merge in current file context
  local ctx = current_file_context()
  data.file = data.file or ctx.file
  data.line = data.line or ctx.line

  local f = io.open(action_file, "w")
  if not f then return end
  f:write(vim.fn.json_encode(data))
  f:close()
end

local function detach()
  vim.fn.system("tmux detach-client")
end

-- q in normal mode: close layer
-- Applied on every BufEnter to override buffer-local q mappings (e.g. Snacks dashboard)
local function set_q_mappings()
  vim.keymap.set("n", "q", function()
    write_action({ action = "close" })
    detach()
  end, { buffer = 0, noremap = true, desc = "Pi: close layer" })

  vim.keymap.set("n", "Q", "q", { buffer = 0, noremap = true, desc = "Record macro (moved from q)" })
end

set_q_mappings()
vim.api.nvim_create_autocmd("BufEnter", { callback = set_q_mappings })

-- Ctrl+z in normal mode: close layer (same as q)
vim.keymap.set("n", "<C-z>", function()
  write_action({ action = "close" })
  detach()
end, { noremap = true, desc = "Pi: close layer" })

-- Tab in normal mode: cycle to next layer
vim.keymap.set("n", "<Tab>", function()
  write_action({ action = "cycle" })
  detach()
end, { noremap = true, desc = "Pi: cycle layer" })

-- Shift+Tab in normal mode: cycle to previous layer
vim.keymap.set("n", "<S-Tab>", function()
  write_action({ action = "cycle-back" })
  detach()
end, { noremap = true, desc = "Pi: cycle layer back" })

-- Alt+r in normal mode: go to diff/review layer for current file
vim.keymap.set("n", "<A-r>", function()
  write_action({ action = "goto", target = "diff" })
  detach()
end, { noremap = true, desc = "Pi: go to diff layer" })

-- Alt+n in normal mode: go to notes layer for current file
vim.keymap.set("n", "<A-n>", function()
  write_action({ action = "goto", target = "notes" })
  detach()
end, { noremap = true, desc = "Pi: go to notes layer" })

-- <leader>s in visual mode: send selection to pi
-- Uses :<C-u> to force vim to set '< '> marks before the function runs
-- (which-key can prevent marks from being set on first visual selection otherwise)
function _G.pi_send_selection()
  local mode = vim.fn.visualmode()
  local s = vim.fn.getpos("'<")
  local e = vim.fn.getpos("'>")
  local lines = vim.api.nvim_buf_get_lines(0, s[2] - 1, e[2], false)
  if #lines == 0 then return end
  if mode == "v" then
    local end_col = e[3] == 2147483647 and #lines[#lines] or e[3]
    if #lines == 1 then
      lines[1] = lines[1]:sub(s[3], end_col)
    else
      lines[1] = lines[1]:sub(s[3])
      lines[#lines] = lines[#lines]:sub(1, end_col)
    end
  elseif mode == "\22" then
    local sc, ec = s[3], e[3]
    if sc > ec then sc, ec = ec, sc end
    for i, line in ipairs(lines) do
      lines[i] = line:sub(sc, ec)
    end
  end

  local abs = vim.fn.expand("%:p")
  local git_root = vim.fn.systemlist("git rev-parse --show-toplevel")[1] or ""
  local rel = abs
  if git_root ~= "" and abs:sub(1, #git_root) == git_root then
    rel = abs:sub(#git_root + 2)
  end
  local prefix = "file: " .. rel .. ":L" .. s[2] .. "-L" .. e[2] .. "\ncontent:\n"

  write_action({
    action = "send",
    text = prefix .. table.concat(lines, "\n") .. "\n",
  })
  detach()
end
vim.keymap.set("v", "<leader>s", ":<C-u>lua pi_send_selection()<CR>", { noremap = true, silent = true, desc = "Pi: send selection" })
