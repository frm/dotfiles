import snippet_helpers

class_path_blacklist = [
        "app",
        "models",
        "controllers",
        "jobs",
        "helpers",
        "channels",
        "test",
        "lib",
        "test",
        "views",
        "services"
]

def class_name(path, snip):
    snip.rv = snippet_helpers.name_from_file(path, "::", class_path_blacklist)

def open_module(path, snip):
    mods = snippet_helpers.name_components_from_file(path, class_path_blacklist)

    for idx, mod in enumerate(mods):
        snip.rv += ("  " * idx) + "module " + mod + "\n"

    # this is required to correctly position the cursor
    snip.rv += "  " * len(mods)

def close_module(path, snip):
    mods = snippet_helpers.name_components_from_file(path, class_path_blacklist)
    length = len(mods) - 1

    for idx, _ in enumerate(mods):
        indent_level = length - idx
        snip.rv += "\n" + ("  " * indent_level) + "end"
