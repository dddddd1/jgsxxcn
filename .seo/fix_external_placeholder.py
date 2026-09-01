#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 via.placeholder.com 外部占位图替换为本站产品图，并修复空洞 alt。"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEAK_ALT = {"图片", "img"}
SRC_PAT = re.compile(r'(src\s*=\s*["\'])[^"\'>]*via\.placeholder\.com[^"\'>]*(["\'])', re.I)
ALT_PAT = re.compile(r'<img\b[^>]*\balt="([^"]*)"[^>]*>', re.I)

def page_keyword(html):
    m = re.search(r'<title[^>]*>(.*?)</title>', html, re.S | re.I)
    if m:
        t = re.sub(r'\s+', ' ', m.group(1)).strip()
        t = re.split(r'\s*[-_|]\s*', t)[0]
        if t:
            return t
    return "工业分选设备"

def weak(alt):
    return alt.strip() in WEAK_ALT or alt.strip().startswith(("pagenumber_", "text="))

count = 0
for dirpath, dirnames, files in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in ('.git', '.seo') and not d.startswith('zb_')]
    for fn in files:
        if not fn.endswith('.html'):
            continue
        p = os.path.join(dirpath, fn)
        html = open(p, encoding='utf-8').read()
        if 'via.placeholder.com' not in html:
            continue
        # 根据目录深度确定相对路径（post/xx.html -> ../）
        rel = os.path.relpath(ROOT, dirpath)  # '' 或 '..'
        local = (rel + '/' if rel else '') + 'images/external/placeholder.jpg'
        kw = page_keyword(html)
        def do_src(m):
            return m.group(1) + local + m.group(2)
        html2 = SRC_PAT.sub(do_src, html)
        def do_img(m):
            tag = m.group(0)
            am = re.search(r'\balt="([^"]*)"', tag)
            if am and weak(am.group(1)):
                tag = re.sub(r'\balt="[^"]*"', 'alt="%s 实拍图"' % kw, tag, count=1)
            return tag
        html2 = ALT_PAT.sub(do_img, html2)
        open(p, 'w', encoding='utf-8').write(html2)
        count += 1
        print("处理:", os.path.relpath(p, ROOT), "->", local)
print("共处理 %d 个文件" % count)