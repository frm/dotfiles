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

-- Tab in normal mode: cycle to next layer
vim.keymap.set("n", "<Tab>", function()
  write_action({ action = "cycle" })
  detach()
end, { noremap = true, desc = "Pi: cycle layer" })

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
vim.keymap.set("v", "<leader>s", function()
  -- Reselect and yank into register z
  vim.cmd('noautocmd normal! gv"zy')
  local text = vim.fn.getreg("z")

  write_action({
    action = "send",
    text = text,
  })
  detach()
end, { noremap = true, desc = "Pi: send selection" })
