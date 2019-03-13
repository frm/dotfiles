import os

def name_components_from_file(path, blacklist = []):
    scrubbed_path = scrub_path(path, blacklist)

    return [camelize(p) for p in scrubbed_path]

def name_from_file(path, separator = ".", blacklist = []):
    name_components = name_components_from_file(path, blacklist)

    return separator.join(name_components)

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
