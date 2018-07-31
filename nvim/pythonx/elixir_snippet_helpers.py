import os

module_path_blacklist = ["apps", "lib", "test", "controllers", "views"]

def module_name(path, snip):
    scrubbed_path = scrub_path(path)
    mod_name = ".".join([camelize(p) for p in scrubbed_path])
    snip.rv = mod_name

def scrub_path(path):
    path_without_ext = os.path.splitext(path)[0]
    split_path = path_without_ext.split(os.sep)

    scrubbed_path = []
    for p in split_path:
        if p not in module_path_blacklist and p not in scrubbed_path:
            scrubbed_path.append(p)

    return scrubbed_path

def camelize(string):
    return string.replace("_", " ").title().replace(" ", "")
