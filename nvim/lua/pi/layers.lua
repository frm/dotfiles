local action_file = vim.env.PI_LAYER_ACTION_FILE

local function write_action(data)
  local f = io.open(action_file, "w")
  if not f then return end
  f:write(vim.fn.json_encode(data))
  f:close()
end

local function detach()
  vim.fn.system("tmux detach-client")
end

-- q in normal mode: close layer
vim.keymap.set("n", "q", function()
  write_action({ action = "close" })
  detach()
end, { noremap = true, desc = "Pi: close layer" })

-- Q takes over macro recording (q's original role)
vim.keymap.set("n", "Q", "q", { noremap = true, desc = "Record macro (moved from q)" })

-- Tab in normal mode: cycle to next layer
vim.keymap.set("n", "<Tab>", function()
  write_action({ action = "cycle" })
  detach()
end, { noremap = true, desc = "Pi: cycle layer" })

-- <leader>s in visual mode: send selection to pi
vim.keymap.set("v", "<leader>s", function()
  -- Yank selection into register z
  vim.cmd('noautocmd normal! "zy')
  local text = vim.fn.getreg("z")
  local file = vim.fn.expand("%:p")
  local line = vim.fn.line("'<")

  write_action({
    action = "send",
    text = text,
    file = file,
    line = line,
  })
  detach()
end, { noremap = true, desc = "Pi: send selection" })
