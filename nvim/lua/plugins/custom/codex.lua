local M = {}

function M.toggle()
  local codex = require('codex')
  local was_open = codex.is_open and codex.is_open()
  codex.toggle()
  if not was_open then
    vim.schedule(function() vim.cmd('startinsert') end)
  end
end

function M.focus()
  local codex = require('codex')
  -- Open if not open
  if not (codex.is_open and codex.is_open()) then
    codex.open()
  end
  -- Find and focus the codex terminal window
  vim.schedule(function()
    for _, buf in ipairs(vim.api.nvim_list_bufs()) do
      local name = vim.api.nvim_buf_get_name(buf)
      if name:match("codex") and vim.bo[buf].buftype == "terminal" then
        for _, win in ipairs(vim.api.nvim_list_wins()) do
          if vim.api.nvim_win_get_buf(win) == buf then
            vim.api.nvim_set_current_win(win)
            vim.cmd('startinsert')
            return
          end
        end
      end
    end
  end)
end

function M.select_model()
  local cache_path = vim.fn.expand('~/.codex/models_cache.json')
  local file = io.open(cache_path, 'r')
  if not file then
    vim.notify('Codex models cache not found. Run /models in codex first.', vim.log.levels.WARN)
    return
  end

  local content = file:read('*all')
  file:close()

  local ok, data = pcall(vim.fn.json_decode, content)
  if not ok or not data.models then
    vim.notify('Failed to parse models cache', vim.log.levels.ERROR)
    return
  end

  local models = {}
  for _, m in ipairs(data.models) do
    table.insert(models, m.slug)
  end

  vim.ui.select(models, { prompt = 'Select Codex model:' }, function(selected)
    if not selected then return end

    local codex = require('codex')
    local state = require('codex.state')

    -- Kill existing job if running
    if state.job then
      vim.fn.jobstop(state.job)
      state.job = nil
    end

    -- Close window
    codex.close()

    -- Delete old buffer to force fresh terminal
    if state.buf and vim.api.nvim_buf_is_valid(state.buf) then
      vim.api.nvim_buf_delete(state.buf, { force = true })
      state.buf = nil
    end

    -- Update config and reopen
    codex.setup({ model = selected })
    codex.open()
    vim.schedule(function() vim.cmd('startinsert') end)
  end)
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
