import snippet_helpers

blacklist = [
    "src",
    "sections",
    "pages",
    "lib",
    "components",
    "index",
    "screens"
]

def component_name(path, snip):
    path_components = snippet_helpers.scrub_path(path, blacklist)
    name = ".".join(path_components)
    snip.rv = name
