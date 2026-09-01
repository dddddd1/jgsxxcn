#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""修复清理后残留的 placeholder.jpg"[单字符] 畸形，然后补齐 alt/title。"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 修复：src="...placeholder.jpg"[字母] />  ->  src="...placeholder.jpg" />
FIX = re.compile(r'(src="[^"]*placeholder\.jpg")[a-zA-Z] ?/?>', re.I)

files = 0
for dirpath, dirnames, names in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in ('.git', '.seo') and not d.startswith('zb_')]
    for fn in names:
        if not fn.endswith('.html'):
            continue
        p = os.path.join(dirpath, fn)
        html = open(p, encoding='utf-8').read()
        new, n = FIX.subn(lambda m: m.group(1) + ' />', html)
        if n:
            open(p, 'w', encoding='utf-8').write(new)
            files += 1
            print("修复 ", os.path.relpath(p, ROOT), "n=", n)
print("修复文件数:", files)