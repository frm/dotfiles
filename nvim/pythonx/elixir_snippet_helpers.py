import snippet_helpers
import re

module_path_disallowlist = ["apps", "lib", "test", "controllers", "views", "support"]

capitalizations = [
    "abi",
    "api",
    "aws",
    "csv",
    "ens",
    "html",
    "http",
    "https",
    "json",
    "rest",
    "rpc",
    "sns",
    "sqs",
    "toml",
    "url",
    "wip",
    "yaml"
]

def module_name(path, snip, trim = ""):
    module = (snippet_helpers
        .name_from_file(path, ".", module_path_disallowlist)
        .replace(trim, ""))

    snip.rv = replace_with_capitalizations(module)

def schema_name(path, snip):
    snip.rv = snippet_helpers.scrub_path(path, module_path_disallowlist)[-1]

def app_name(path, snip):
    snip.rv = app_module_name(path)

def test_case(path, snip):
    app_module = app_module_name(path)

    if "controller" in path or "plug" in path:
        snip.rv = app_module + ".ConnCase"
    else:
        snip.rv = "ExUnit.Case"

# private

def app_module_name(path):
    name = snippet_helpers.scrub_path(path, module_path_disallowlist)[0]
    return snippet_helpers.camelize(name)

def replace_with_capitalizations(module):
    for word in capitalizations:
        module = re.sub(word, word.upper(), module, flags = re.IGNORECASE)

    return module
