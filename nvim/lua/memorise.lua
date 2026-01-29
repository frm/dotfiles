local M = {}

local function open_memorise_window()
    local memorise_path = vim.fn.stdpath("config") .. "/memorise.txt"

    -- Read file contents
    local lines = {}
    local file = io.open(memorise_path, "r")
    if not file then
        vim.notify("memorise.txt not found at " .. memorise_path, vim.log.levels.ERROR)
        return
    end
    for line in file:lines() do
        table.insert(lines, line)
    end
    file:close()

    -- Calculate window size
    local width = 80
    local height = math.min(#lines + 2, math.floor(vim.o.lines * 0.8))
    local row = math.floor((vim.o.lines - height) / 2)
    local col = math.floor((vim.o.columns - width) / 2)

    -- Create buffer
    local buf = vim.api.nvim_create_buf(false, true)
    vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
    vim.api.nvim_buf_set_option(buf, "modifiable", false)
    vim.api.nvim_buf_set_option(buf, "bufhidden", "wipe")

    -- Create floating window
    local win = vim.api.nvim_open_win(buf, true, {
        relative = "editor",
        width = width,
        height = height,
        row = row,
        col = col,
        style = "minimal",
        border = "rounded",
        title = " Keybindings ",
        title_pos = "center",
    })

    -- Close with q or Escape
    vim.keymap.set("n", "q", function()
        vim.api.nvim_win_close(win, true)
    end, { buffer = buf, silent = true })
    vim.keymap.set("n", "<Esc>", function()
        vim.api.nvim_win_close(win, true)
    end, { buffer = buf, silent = true })
end

function M.setup()
    vim.keymap.set("n", "<localleader>gm", open_memorise_window, {
        noremap = true,
        silent = true,
        desc = "Open keybindings memorise window"
    })
end

return M
