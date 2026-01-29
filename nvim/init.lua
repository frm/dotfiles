require("pkgmngr")
require("base")
require("keybindings")

if vim.g.vscode then
  require("plugins/cursor/plugins")
  require("plugins/cursor/config")
else
  require("plugins")
  require("plugins/config")
end

require("colours")
require("tabfix")
