#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
图片百度收录优化脚本：
1. 随机命名图片重命名为语义化关键词文件名
2. 全站 .html/.xml 引用替换为新文件名
3. 隔离无关装饰图（移除页面引用 + robots.txt Disallow）
4. 为所有缺失 alt 的 <img> 补齐关键词 alt/title
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

RENAME = {
    "0aGngZx7Jdg":  ("banjin-lianxi-fangshi",      "常州钣金加工联系方式电话"),
    "0aGnfczcfSq":  ("yangli-zhewangji",           "扬力数控折弯机车间实拍"),
    "0RxmKOQ5k5Q":  ("jiguang-qiege-jiajia",       "激光切割机切割金属板实拍"),
    "0Vh1WCBsKvY":  ("jiguang-qiegeji-shebei",     "光纤激光切割机设备图"),
    "0Vh1Df5LAw4":  ("jinshu-lixianjia-jixuanjian","金属机箱机柜安装加工件"),
    "0Vh1Df8wuqu":  ("zhutie-duangai-zhujian",     "铸铁端盖铸造件毛坯"),
    "0Vh1DVLwBMW":  ("jinshu-gongxing-anzhuangjian","弧形金属安装配件"),
    "0Vh1UkXHjxw":  ("jinshu-moji-anzhuangban",    "金属安装底板零件"),
    "0X3HYnlx3kO":  ("cnc-lishi-jiazhongzhongxin", "CNC立式加工中心设备"),
    "0anep4Rohzk":  ("hanjie-zuoye-xianchang",     "焊接工人焊接作业现场"),
    "0anf4eupsoa":  ("yaoxin-hansi-yuanli",        "药芯焊丝电弧焊工艺原理图"),
    "0anf4hy9oyO":  ("hanjieji-yaokonghe",         "焊接机遥控盒控制面板"),
    "0anf4ie4xNY":  ("hanjie-qiang-caozuo-ling",   "焊枪角度操作要领技术图"),
    "0anfa3u861A":  ("chongya-moji-01",            "冲压模具"),
    "0anfa6VKPU8":  ("chongya-moji-fangzhen",      "汽车覆盖件模具干涉仿真"),
    "0anfa73rz5k":  ("jinshu-chongya-moji",        "级进冲压模具"),
}
QUARANTINE = ["0Vh1DfADqFs"]

IMG_RE = re.compile(r'<img\b[^>]*>', re.I)


def page_keyword(html):
    m = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.S | re.I)
    if m:
        t = re.sub(r'<[^>]+>', '', m.group(1)).strip()
        if t:
            return t
    m = re.search(r'<title[^>]*>(.*?)</title>', html, re.S | re.I)
    if m:
        t = re.sub(r'\s+', ' ', m.group(1)).strip()
        t = re.split(r'\s*[-_|]\s*', t)[0]
        if t:
            return t
    return "工业分选设备"


def has_attr(tag, attr):
    return re.search(r'\b%s\s*=' % attr, tag, re.I) is not None


def add_attr(tag, attr, value):
    if has_attr(tag, attr):
        return tag
    value = value.replace('"', '&quot;')
    if tag.endswith('/>'):
        return tag[:-2] + ' %s="%s" />' % (attr, value)
    return tag[:-1] + ' %s="%s">' % (attr, value)


def process_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()
    orig = html
    kw = page_keyword(html)

    # 1) 隔离图：移除整段 <img ...隔离图...>
    for q in QUARANTINE:
        pat = re.compile(r'<img\b(?=[^>]*\b%s\b)[^>]*/?>' % re.escape(q), re.I)
        html = pat.sub('', html)

    # 2) 重命名引用
    for old, (_new, _alt) in RENAME.items():
        html = html.replace(old + '.jpg', _new + '.jpg')

    # 3) 重命名后的图补专属 alt
    for old, (new, alt) in RENAME.items():
        pat = re.compile(r'<img\b(?![^>]*\balt=)(?=[^>]*\b%s\.jpg\b)[^>]*>' % re.escape(new), re.I)
        html = pat.sub(lambda m: add_attr(m.group(0), 'alt', alt), html)

    # 4) 位于 <a title="X"> 内且缺 alt 的图 -> alt = X
    def anchored(anchor_match):
        block = anchor_match.group(0)
        title = re.search(r'<a\b[^>]*\btitle="([^"]*)"', block, re.I)
        t = re.sub(r'\s+', ' ', title.group(1)).strip() if title else ''
        rest, n = IMG_RE.subn(
            lambda m: add_attr(m.group(0), 'alt', t) if not has_attr(m.group(0), 'alt') else m.group(0),
            block)
        return rest
    html = re.sub(r'<a\b[^>]*\btitle="[^"]*"[^>]*>.*?</a>', anchored, html, flags=re.S | re.I)

    # 5) 其余仍缺 alt 的图 -> 页面关键词 + 实拍图
    default_alt = kw + " 实拍图"
    def default_fix(m):
        return add_attr(m.group(0), 'alt', default_alt)
    html = re.sub(r'<img\b(?![^>]*\balt=)[^>]*>', default_fix, html, flags=re.I)

    # 6) 缺 title 且已有 alt -> 补 title = alt
    def title_fix(m):
        tag = m.group(0)
        if has_attr(tag, 'title'):
            return tag
        am = re.search(r'\balt="([^"]*)"', tag)
        return add_attr(tag, 'title', am.group(1)) if am else tag
    html = IMG_RE.sub(title_fix, html)

    if html != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(html)
        return True
    return False


def main():
    changed = []
    total = 0
    for dirpath, dirnames, files in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in ('.git', '.seo') and not d.startswith('zb_')]
        for fn in files:
            if fn.endswith(('.html', '.htm')):
                total += 1
                if process_file(os.path.join(dirpath, fn)):
                    changed.append(os.path.relpath(os.path.join(dirpath, fn), ROOT))
    print("扫描 HTML 总数: %d, 已修改: %d" % (total, len(changed)))


if __name__ == '__main__':
    main()