#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""HTML 结构体检：用 html.parser 检测明显的标签破坏/未闭合 img。"""
import os
import re
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class Chk(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.imgs = 0
        self.bad_attrs_starts = []
    def handle_starttag(self, tag, attrs):
        pass
    def handle_startendtag(self, tag, attrs):
        if tag == 'img':
            self.imgs += 1

issues = 0
total = 0
BROKEN = re.compile(r'<img\b[^>]*(?:placeholder\.jpg"|images/external/)[^>]*[a-zA-Z][^>=]/?>', re.I)
for dirpath, dirnames, names in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in ('.git', '.seo') and not d.startswith('zb_')]
    for fn in names:
        if not fn.endswith(('.html', '.htm')):
            continue
        total += 1
        p = os.path.join(dirpath, fn)
        s = open(p, encoding='utf-8').read()
        # 已闭合 img 计数
        c = Chk()
        try:
            c.feed(s)
        except Exception as e:
            issues += 1
            print("PARSE ERROR:", os.path.relpath(p, ROOT), e)
            continue
        # 粗查是否有 img 未以 > 结尾
        for m in re.finditer(r'<img\b', s):
            seg = s[m.start():m.start()+2000]
            close = re.search(r'>', seg)
            if not close:
                print("IMG未闭合:", os.path.relpath(p, ROOT))
                issues += 1
        # src 非法残留
        bad = re.findall(r'<img\b[^>]*src="[^"]*"[^ >]', s)
        if bad:
            issues += len(bad)
            print("IMG src后残留(%d):" % len(bad), os.path.relpath(p, ROOT), bad[0][:60])
print("扫描文件 %d，发现问题 %d" % (total, issues))