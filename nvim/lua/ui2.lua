-- Experimental new TUI introduced in Neovim 0.12.
if vim.g.vscode then
  return
end

local ok, ui2 = pcall(require, "vim._core.ui2")
if not ok then
  return
end

ui2.enable({
  msg = { target = "msg" },
})

-- Match the lualine horizon filename color.
local msg_fg = "#8B8D8F"

local function apply_highlights()
  vim.api.nvim_set_hl(0, "Ui2MsgBorder", { fg = msg_fg })
  vim.api.nvim_set_hl(0, "Ui2MsgText", { fg = msg_fg })
end

apply_highlights()
vim.api.nvim_create_autocmd("ColorScheme", {
  group = vim.api.nvim_create_augroup("ui2_msg_colors", { clear = true }),
  callback = apply_highlights,
})

-- ui2 doesn't draw a border on the msg window by default; add one and color it.
vim.api.nvim_create_autocmd("FileType", {
  pattern = "msg",
  group = vim.api.nvim_create_augroup("ui2_msg_border", { clear = true }),
  callback = function(args)
    for _, win in ipairs(vim.fn.win_findbuf(args.buf)) do
      pcall(vim.api.nvim_win_set_config, win, { border = "rounded" })
      pcall(vim.api.nvim_set_option_value, "winhighlight",
        "FloatBorder:Ui2MsgBorder,NormalFloat:Ui2MsgText", { win = win })
    end
  end,
})

-- ui2's msg float persists the last message until something replaces it. On the
-- mini.starter dashboard there's nothing new to print, so leftovers (e.g.
-- :checkhealth progress from a previous session) hang around. Close any open
-- msg windows when the dashboard opens.
vim.api.nvim_create_autocmd("User", {
  pattern = "MiniStarterOpened",
  group = vim.api.nvim_create_augroup("ui2_msg_clear_on_starter", { clear = true }),
  callback = function()
    for _, win in ipairs(vim.api.nvim_list_wins()) do
      local buf = vim.api.nvim_win_get_buf(win)
      if vim.bo[buf].filetype == "msg" then
        pcall(vim.api.nvim_win_close, win, true)
      end
    end
  end,
})
