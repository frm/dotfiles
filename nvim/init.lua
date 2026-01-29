require("pkgmngr")
require("base")
require("keybindings")
require("memorise").setup()
require("plugins/pre_load")

if vim.g.vscode then
  require("plugins/cursor/plugins")
  require("plugins/cursor/post_load")
else
  require("plugins")
  require("plugins/post_load")
end

require("colours")
require("tabfix")
