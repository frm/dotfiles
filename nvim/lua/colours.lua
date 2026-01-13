vim.opt.termguicolors = true
vim.opt.background = "dark"

-- dracula
-- vim.cmd("highlight IlluminatedWordText gui=None guibg=#424450")
-- vim.cmd("highlight IlluminatedWordRead gui=None guibg=#424450")
-- vim.cmd("highlight IlluminatedWordWrite gui=None guibg=#424450")

-- gruvbox
-- vim.g.gruvbox_material_better_performance = 1
-- vim.g.gruvbox_material_background = "soft"
-- vim.g.gruvbox_material_enable_italic = 0
-- vim.g.gruvbox_material_disable_italic_comment = 1

-- everforest
-- vim.g.everforest_better_performance = 1
-- vim.g.everforest_background = "soft"
-- vim.g.everforest_enable_italic = 0
-- vim.g.everforest_disable_italic_comment = 1
-- vim.g.everforest_transparent_background = 1
-- vim.g.everforest_current_word = "grey background"

-- catpuccin
-- vim.cmd.colorscheme("catppuccin-" .. os.getenv("CATPPUCCIN_VARIANT"))

-- horizon
vim.api.nvim_create_autocmd("ColorScheme", {
callback = function()
  vim.api.nvim_set_hl(0, "IlluminatedWordText",  { bg = "#2a2d37", underline = false })
  vim.api.nvim_set_hl(0, "IlluminatedWordRead",  { bg = "#2a2d37", underline = false })
  vim.api.nvim_set_hl(0, "IlluminatedWordWrite", { bg = "#2a2d37", underline = false })
end,
})

vim.cmd.colorscheme("horizon")

vim.opt.showtabline = 0
vim.opt.laststatus = 2
vim.opt.fillchars:append("vert:│")

local signs = {Error = "× ", Warn = " ", Hint = "💡", Info = " "}
for type, icon in pairs(signs) do
    local hl = "DiagnosticSign" .. type
    vim.fn.sign_define(hl, {text = icon, texthl = hl, numhl = hl})
end

