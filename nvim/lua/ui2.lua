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
