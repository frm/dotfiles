require("pkgmngr")
require("base")
require("keybindings")
require("plugins/pre_load")

if vim.g.vscode then
  require("plugins/vscode/plugins")
  require("plugins/vscode/post_load")
else
  require("plugins")
  require("plugins/post_load")
end

-- require("lsp") -- TODO: trying out without lsp configs, see if it anything changes. Removing if not
require("colours")
require("tabfix")
