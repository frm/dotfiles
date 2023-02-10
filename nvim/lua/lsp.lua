local nvim_lsp = require('lspconfig')
local coq = require('coq')

local merge = function(t1, t2)
    for k, v in pairs(t2) do
        if (type(v) == "table") and (type(t1[k] or false) == "table") then
            merge(t1[k], t2[k])
        else
            t1[k] = v
        end
    end

    return t1
end

local on_attach = function(client, bufnr)
    -- So that the only client with format capabilities is efm
    if client.name == 'tsserver' then
        client.server_capabilities.documentFormattingProvider = false
        client.server_capabilities.documentRangeFormattingProvider = false
    end

    if client.server_capabilities.documentFormattingProvider then
        vim.cmd [[
          augroup Format
            au! * <buffer>
            au BufWritePre <buffer> lua vim.lsp.buf.format(nil, nil, {'efm'})
          augroup END
        ]]
    end
end

local mixformat = {
    formatCommand = 'mix format -',
    formatStdin = true
}

local luaformat = {
    formatCommand = 'lua-format -i',
    formatStdin = true
}

local prettier = {
    formatCommand = 'npx prettier --stdin-filepath ${INPUT}',
    formatStdin = true,
}

local languages = {
    css = {prettier},
    html = {prettier},
    javascript = {prettier},
    javascriptreact = {prettier},
    json = {prettier},
    markdown = {prettier},
    scss = {prettier},
    scss = {prettier},
    typescript = {prettier},
    typescriptreact = {prettier},
    elixir = {mixformat},
    lua = {luaformat}
}

local do_setup = function(name, config)
    nvim_lsp[name].setup(coq.lsp_ensure_capabilities(merge({
        on_attach = on_attach,
        flags = {debounce_text_changes = 150},
        root_dir = nvim_lsp.util.root_pattern {".git"}
    }, config)))
end

do_setup('rust_analyzer', {root_dir = nvim_lsp.util.root_pattern {"Cargo.toml"}})

do_setup('tsserver', {
    root_dir = nvim_lsp.util
        .root_pattern {'.git/', "package.json", "tsconfig.json"}
})

do_setup('efm', {
    root_dir = nvim_lsp.util.root_pattern {
        '.git/', "package.json", "tsconfig.json"
    },
    init_options = {documentFormatting = true, codeAction = true},
    filetypes = vim.tbl_keys(languages),
    settings = {version = 2, languages = languages}
})

do_setup('elixirls',
         {root_dir = nvim_lsp.util.root_pattern {'.git/', 'mix.exs'}})

vim.lsp.handlers['textDocument/publishDiagnostics'] =
    vim.lsp.with(vim.lsp.diagnostic.on_publish_diagnostics, {
        virtual_text = false,
        signs = true,
        underline = false,
        update_in_insert = false
    })
