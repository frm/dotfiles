vim.opt.termguicolors = true
vim.opt.background = "dark"

-- Rainbow delimiters configuration
vim.g.rainbow_delimiters = {
  strategy = {
    [''] = require('rainbow-delimiters').strategy['global'],
  },
  query = {
    [''] = 'rainbow-delimiters',
  },
}

local function set_hl(group, opts)
  vim.api.nvim_set_hl(0, group, opts)
end

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
  set_hl("IlluminatedWordText",  { bg = "#2a2d37", underline = false })
  set_hl("IlluminatedWordRead",  { bg = "#2a2d37", underline = false })
  set_hl("IlluminatedWordWrite", { bg = "#2a2d37", underline = false })

  -- Fix snacks to work with horiozn
  set_hl("NormalFloat", { fg = "#d5d8da", bg = "#1d1f27" })
  set_hl("SnacksPickerMatch", { fg = "#e95678", bold = true })  -- horizon red/pink for matches
  set_hl("SnacksPickerDir", { fg = "#6c6f93" })                 -- horizon comment gray for directory
  set_hl("SnacksPickerFile", { fg = "#d5d8da" })                -- normal text for filename
  set_hl("SnacksPickerPathHidden", { fg = "#4B4C53" })          -- dimmer gray for hidden path

  -- improve horizon highlighting in elixir

  -- atoms -> orange like booleans
  set_hl("@string.special.symbol.elixir", { link = "@boolean" })

  -- regular variables -> default text color
  -- vim.api.nvim_set_hl(0, "@variable.elixir", { link = "Normal" })
  -- vim.api.nvim_set_hl(0, "@variable.parameter.elixir", { link = "Normal" })

  -- module attributes -> should be red
  set_hl("@constant.elixir", { link = "@variable" })

  -- function keywords -> bold
  local keyword_hl = vim.api.nvim_get_hl(0, { name = "Keyword" })
  set_hl("@keyword.function.elixir", vim.tbl_extend("force", keyword_hl, { bold = true }))
  set_hl("@keyword.elixir", vim.tbl_extend("force", keyword_hl, { bold = true }))

  -- operators -> yellow
  set_hl("@operator.elixir", { link = "Structure" })

  -- rainbow delimiters: first level purple, second level blue, third level yellow
  set_hl("RainbowDelimiterRed", { link = "Keyword" })      -- purple
  set_hl("RainbowDelimiterYellow", { link = "Function" })  -- blue
  set_hl("RainbowDelimiterBlue", { link = "Structure" })   -- yellow
  set_hl("RainbowDelimiterOrange", { link = "Keyword" })   -- cycle back to purple
  set_hl("RainbowDelimiterGreen", { link = "Function" })   -- cycle back to blue
  set_hl("RainbowDelimiterViolet", { link = "Structure" }) -- cycle back to yellow
  set_hl("RainbowDelimiterCyan", { link = "Keyword" })     -- cycle back to purple
end,
})

vim.cmd.colorscheme("horizon")

vim.opt.laststatus = 2
vim.opt.fillchars:append("vert:│")

local signs = {Error = "× ", Warn = " ", Hint = "💡", Info = " "}
for type, icon in pairs(signs) do
    local hl = "DiagnosticSign" .. type
    vim.fn.sign_define(hl, {text = icon, texthl = hl, numhl = hl})
end

