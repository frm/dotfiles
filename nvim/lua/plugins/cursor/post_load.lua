-- LuaFormatter off

-----------------------------------------------------------------
-- Hop
-----------------------------------------------------------------

require('hop').setup()
local hop = require("hop")

vim.keymap.set('', 'f', function()
  hop.hint_char1()
end, { remap=true })

-- these are the default configs for nvim but for vs code/cursor we just want
-- the hint_char1 option, no need for the others. keeping them here for
-- completeness
--
-- local directions = require('hop.hint').HintDirection
--
-- vim.keymap.set('', 'f', function()
--   hop.hint_char1({ direction = directions.AFTER_CURSOR, current_line_only = true })
-- end, { remap=true })
--
-- vim.keymap.set('', 'F', function()
--   hop.hint_char1({ direction = directions.BEFORE_CURSOR, current_line_only = true })
-- end, { remap=true })
--
-- vim.keymap.set('', 't', function()
--   hop.hint_char1({ direction = directions.AFTER_CURSOR, current_line_only = true, hint_offset = -1 })
-- end, { remap=true })
--
-- vim.keymap.set('', 'T', function()
--   hop.hint_char1({ direction = directions.BEFORE_CURSOR, current_line_only = true, hint_offset = 1 })
-- end, { remap=true })
--

-- LuaFormatter on
