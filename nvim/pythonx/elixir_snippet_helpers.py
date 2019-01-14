import snippet_helpers

module_path_blacklist = ["apps", "lib", "test", "controllers", "views"]

def module_name(path, snip):
    snip.rv = snippet_helpers.name_from_file(path, ".", module_path_blacklist)
