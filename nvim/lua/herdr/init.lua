-- herdr integration, active only when nvim is running inside a herdr popup.
if not vim.env.HERDR_HOST_PANE_ID then return end

require("herdr.popup")
