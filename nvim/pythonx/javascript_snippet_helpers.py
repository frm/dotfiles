import snippet_helpers

disallowlist = [
    "src",
    "sections",
    "pages",
    "lib",
    "components",
    "index",
    "screens"
]

def component_name(path, snip):
    path_components = snippet_helpers.scrub_path(path, disallowlist)
    name = ".".join(path_components)
    snip.rv = name
