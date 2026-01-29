----------
-- Setup
----------
local function map(mode, combo, mapping)
    vim.api.nvim_set_keymap(mode, combo, mapping, {noremap = true})
end

local autocmd = vim.api.nvim_create_autocmd

----------
-- Config
----------

vim.g.mapleader = ' '
vim.g.maplocalleader = ','

vim.opt.timeoutlen = 300
map('i', 'jk', '<Esc>')

-- Better pane movement
map('n', '<C-h>', '<C-w>h')
map('n', '<C-j>', '<C-w>j')
map('n', '<C-k>', '<C-w>k')
map('n', '<C-l>', '<C-w>l')

-- Better pane switching
map('n', '<M-h>', '<C-w>H')
map('n', '<M-j>', '<C-w>J')
map('n', '<M-k>', '<C-w>K')
map('n', '<M-l>', '<C-w>L')

-- Autosort
map('v', '<leader>s', ':sort<CR>')

-- Swap lines
map('n', 'mj', ':m +1<CR>')
map('n', 'mk', ':m -2<CR>')

-- Clear search results
map('n', '<localleader><leader>', ':noh<CR>')

-- Ctrl+S save
map('n', '<C-s>', ':write<CR>')
map('i', '<C-s>', '<Esc>:write<CR>')

-- Better find/replace bindings
map('n', '<localleader>s', ':s/\\v')
map('n', '<localleader>ss', ':%s/\\v')
map('n', '<localleader>S', ':S/')
map('n', '<localleader>SS', ':%S/')

map('v', '<localleader>s', '"hy:s/\\v<C-r>h/')
map('v', '<localleader>ss', '"hy:%s/\\v<C-r>h/')
map('v', '<localleader>S', '"hy:S/<C-r>h/')
map('v', '<localleader>SS', '"hy:%S/<C-r>h/')

-- replace non-leading whitespaces in the current line with \n
map('n', '<localleader>s ', ':s/\\S\\zs\\s\\+/\\r/g<CR>')

-- Sleep from nvim
function _G.sleep()
    os.execute("osascript -e 'tell application \"System Events\" to sleep'")
end

map('n', '<leader><leader>S', ':call v:lua.sleep()<CR>')

function _G.rename()
    local current = vim.fn.expand('%')
    local new_file = vim.fn.input('New name: ', current)
    if new_file ~= current and new_file ~= '' then
        vim.cmd(':saveas ' .. new_file)
        vim.cmd(':silent !rm ' .. current)
        vim.cmd('redraw!')
    end
end

map('n', '<leader>r', ':call v:lua.rename()<CR>')

-- Refresh the browser
map('n', '<localleader>r', ':silent !browser.refresh<CR>')

-- Make the current file executable
function _G.make_executable()
    local confirmation = vim.fn.confirm("Make this file executable?",
                                        "&Yes\n&No")

    if confirmation == 1 then
        vim.cmd(':silent !chmod +x %')
        vim.cmd('redraw!')
    end
end

map('n', '<C-x>', ':call v:lua.make_executable()<CR>')
