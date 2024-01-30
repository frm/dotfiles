vim.opt.termguicolors = true
vim.opt.background = "dark"

vim.g.gruvbox_material_better_performance = 1
vim.g.gruvbox_material_background = "soft"
vim.g.gruvbox_material_enable_italic = 0
vim.g.gruvbox_material_disable_italic_comment = 1

vim.g.everforest_better_performance = 1
vim.g.everforest_background = "soft"
vim.g.everforest_enable_italic = 0
vim.g.everforest_disable_italic_comment = 1
vim.g.everforest_transparent_background = 1
vim.g.everforest_current_word = "grey background"

vim.cmd.colorscheme("catppuccin-" .. os.getenv("CATPPUCCIN_VARIANT"))

vim.opt.showtabline = 0
vim.opt.laststatus = 2
vim.opt.fillchars:append("vert:│")

-- Set warning signs
local signs = {Error = "× ", Warn = " ", Hint = "💡", Info = " "}
for type, icon in pairs(signs) do
    local hl = "DiagnosticSign" .. type
    vim.fn.sign_define(hl, {text = icon, texthl = hl, numhl = hl})
end

-- Fix vim illuminate
-- bg is set to the same as the dracula theme
vim.cmd("highlight IlluminatedWordText gui=None guibg=#424450")
vim.cmd("highlight IlluminatedWordRead gui=None guibg=#424450")
vim.cmd("highlight IlluminatedWordWrite gui=None guibg=#424450")
