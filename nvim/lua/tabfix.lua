-- This is the weirdest fix yet
-- For some reason, in the lua config, UltiSnips is still overriding <tab>
-- I can't seem to get it to not override, so instead what I'm doing is
-- remapping tab to its default once again.
-- IMPORTANT: This needs to be the last file required by lua.init
vim.api.nvim_set_keymap('i', '<Tab>', '<C-t>', {})
vim.api.nvim_set_keymap('i', '<S-Tab>', '<C-d>', {})
