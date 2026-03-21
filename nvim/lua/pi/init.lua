-- Pi integration (only activates when nvim is launched by pi)
if not vim.env.PI_LAYER_ACTION_FILE then return end

require("pi.layers")
