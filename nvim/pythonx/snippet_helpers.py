import os

def name_from_file(path, separator = ".", blacklist = []):
    scrubbed_path = scrub_path(path, blacklist)
    mod_name = separator.join([camelize(p) for p in scrubbed_path])

    return mod_name

def scrub_path(path, blacklist):
    path_without_ext = os.path.splitext(path)[0]
    split_path = path_without_ext.split(os.sep)

    scrubbed_path = []
    for p in split_path:
        if p not in blacklist and p not in scrubbed_path:
            scrubbed_path.append(p)

    return scrubbed_path

def camelize(string):
    return string.replace("_", " ").title().replace(" ", "")
