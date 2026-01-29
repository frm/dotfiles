local M = {}

function M.toggle()
  local codex = require('codex')
  local was_open = codex.is_open and codex.is_open()
  codex.toggle()
  if not was_open then
    vim.schedule(function() vim.cmd('startinsert') end)
  end
end

function M.send()
  -- Get selection range while still in visual mode
  local start_line = vim.fn.line("v")
  local end_line = vim.fn.line(".")

  -- Ensure start <= end
  if start_line > end_line then
    start_line, end_line = end_line, start_line
  end

  -- Format as file reference (Codex can read the file)
  local filepath = vim.fn.expand("%:.")
  local reference
  if start_line == end_line then
    reference = string.format("%s:%d ", filepath, start_line)
  else
    reference = string.format("%s:%d-%d ", filepath, start_line, end_line)
  end

  -- Exit visual mode
  vim.api.nvim_feedkeys(vim.api.nvim_replace_termcodes("<Esc>", true, false, true), "n", false)

  -- Open codex if not open
  local codex = require('codex')
  if not (codex.is_open and codex.is_open()) then
    codex.open()
  end

  -- Find the codex terminal buffer, send text, and enter insert mode
  vim.schedule(function()
    for _, buf in ipairs(vim.api.nvim_list_bufs()) do
      local name = vim.api.nvim_buf_get_name(buf)
      if name:match("codex") and vim.bo[buf].buftype == "terminal" then
        local chan = vim.bo[buf].channel
        if chan and chan > 0 then
          vim.fn.chansend(chan, reference)
          -- Focus the terminal window and enter insert mode at the end
          for _, win in ipairs(vim.api.nvim_list_wins()) do
            if vim.api.nvim_win_get_buf(win) == buf then
              vim.api.nvim_set_current_win(win)
              vim.cmd('startinsert')
              return
            end
          end
        end
      end
    end
  end)
end

return M
