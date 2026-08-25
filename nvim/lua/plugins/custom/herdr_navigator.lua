-- Ctrl+h/j/k/l moves between Neovim splits, and crosses into the neighbouring
-- herdr pane once there's no split left in that direction.
--
-- The herdr side of this lives in the vim-herdr-navigation plugin: it binds the
-- same chords and checks whether the focused pane runs Neovim, forwarding the
-- key here when it does. This half handles the other direction — leaving.

local M = {}

local DIRECTIONS = {
  { key = "<C-h>", wincmd = "h", direction = "left" },
  { key = "<C-j>", wincmd = "j", direction = "down" },
  { key = "<C-k>", wincmd = "k", direction = "up" },
  { key = "<C-l>", wincmd = "l", direction = "right" },
}

local function focus_herdr_pane(direction)
  -- Target this pane explicitly: --current resolves to whatever herdr has
  -- focused, which isn't necessarily the pane Neovim is drawing in.
  vim.fn.system({
    vim.env.HERDR_BIN_PATH ~= "" and vim.env.HERDR_BIN_PATH or "herdr",
    "pane",
    "focus",
    "--direction",
    direction,
    "--pane",
    vim.env.HERDR_PANE_ID,
  })
end

local function navigate(wincmd, direction)
  local from = vim.api.nvim_get_current_win()
  vim.cmd("wincmd " .. wincmd)
  if vim.api.nvim_get_current_win() ~= from then
    return
  end

  focus_herdr_pane(direction)
end

function M.setup()
  for _, spec in ipairs(DIRECTIONS) do
    local handler = function()
      navigate(spec.wincmd, spec.direction)
    end

    vim.keymap.set("n", spec.key, handler, { silent = true, noremap = true })
    vim.keymap.set("t", spec.key, function()
      vim.cmd("stopinsert")
      handler()
    end, { silent = true, noremap = true })
  end
end

return M
