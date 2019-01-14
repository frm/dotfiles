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
        "views"
]

def class_name(path, snip):
    snip.rv = snippet_helpers.name_from_file(path, "::", class_path_blacklist)
