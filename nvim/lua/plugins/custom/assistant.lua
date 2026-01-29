local M = {}

local state = {
  zoomed = false,
  prev_layout = nil,
}

function M.zoom()
  -- Only work in Claude or Codex terminals
  local bufname = vim.api.nvim_buf_get_name(0)
  local is_ai_term = bufname:match("claude") or bufname:match("codex")
  if not is_ai_term and vim.bo.buftype ~= "terminal" then
    return
  end

  if state.zoomed then
    -- Restore previous layout
    if state.prev_layout then
      vim.cmd("silent! " .. state.prev_layout)
    end
    state.zoomed = false
    state.prev_layout = nil
  else
    -- Save current layout and zoom
    state.prev_layout = vim.fn.winrestcmd()
    vim.cmd("wincmd |")  -- maximize width
    vim.cmd("wincmd _")  -- maximize height
    state.zoomed = true
  end
end

function M.is_zoomed()
  return state.zoomed
end

return M
