local M = {}

local directions = {
  h = { vim = 'h', zellij = 'left' },
  j = { vim = 'j', zellij = 'down' },
  k = { vim = 'k', zellij = 'up' },
  l = { vim = 'l', zellij = 'right' },
}

local function in_zellij()
  return vim.env.ZELLIJ and vim.env.ZELLIJ ~= ''
end

local function action(...)
  if vim.fn.executable('zellij') ~= 1 or not in_zellij() then
    return
  end

  vim.fn.jobstart(vim.list_extend({ 'zellij', 'action' }, { ... }), { detach = true })
end

local function leave_terminal_mode()
  if vim.api.nvim_get_mode().mode ~= 't' then
    return false
  end

  local keys = vim.api.nvim_replace_termcodes('<C-\\><C-n>', true, false, true)
  vim.api.nvim_feedkeys(keys, 'n', false)

  return true
end

local function move(key)
  local direction = directions[key]

  local function move_or_handoff()
    local current_win = vim.api.nvim_get_current_win()

    vim.cmd('wincmd ' .. direction.vim)

    if current_win == vim.api.nvim_get_current_win() then
      action('move-focus', direction.zellij)
    end
  end

  if leave_terminal_mode() then
    vim.schedule(move_or_handoff)
    return
  end

  move_or_handoff()
end

function M.setup()
  if not in_zellij() then
    return
  end

  for key, _ in pairs(directions) do
    vim.keymap.set({ 'n', 't' }, '<C-' .. key .. '>', function()
      move(key)
    end, { silent = true })
  end
end

return M
