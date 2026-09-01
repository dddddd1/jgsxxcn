#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""清理 src=...placeholder.jpg 后残留的裸内联style文本(历史导入损坏), 保留alt/title。"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# 匹配 img 标签，其中 src="...placeholder.jpg" 后紧跟(无空格) style 裸文本的畸形情况
BAD = re.compile(r'(<img\b[^>]*?src="[^"]*placeholder\.jpg"[^ >])[^>]*>', re.S | re.I)

count = 0
files = 0
for dirpath, dirnames, names in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in ('.git', '.seo') and not d.startswith('zb_')]
    for fn in names:
        if not fn.endswith('.html'):
            continue
        p = os.path.join(dirpath, fn)
        html = open(p, encoding='utf-8').read()
        new, n = BAD.subn(lambda m: m.group(1) + ' />', html)
        if n:
            open(p, 'w', encoding='utf-8').write(new)
            files += 1
            count += n
            print("清理 ", os.path.relpath(p, ROOT), "~n=", n)
print("共清理 %d 处于 %d 个文件" % (count, files))