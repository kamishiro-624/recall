#!/usr/bin/env python3
"""Bundle index.html + css + js into one self-contained file: python3 tools/bundle.py > recall.html"""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text(encoding="utf8")
html = re.sub(r'<link rel="stylesheet" href="css/styles.css">',
              lambda m: "<style>\n" + (root / "css/styles.css").read_text(encoding="utf8") + "</style>", html)
srcs = re.findall(r'<script src="(js/[^"]+)"></script>\n?', html)
js = "\n".join((root / s).read_text(encoding="utf8") for s in srcs)
html = re.sub(r'(<script src="js/[^"]+"></script>\n?)+', lambda m: "<script>\n" + js + "</script>\n", html)
print(html)
