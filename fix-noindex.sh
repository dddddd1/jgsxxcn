#!/bin/bash

# 批量修复noindex标签脚本
# 用于SEO完全转型：从钣金加工转向金刚石选型机

echo "🔍 开始修复noindex标签..."
echo ""

# 统计修复前数量
before=$(grep -r "noindex, follow" tags-*.html banjinjiagong.html 2>/dev/null | wc -l)
echo "📊 修复前noindex标签数量: $before"

# 修复所有标签页
for file in tags-*.html; do
    if [ -f "$file" ]; then
        # 备份原文件
        cp "$file" "${file}.bak"

        # 替换noindex
        sed -i '' 's/noindex, follow/index, follow/g' "$file"

        # 统计修改后数量
        after=$(grep "noindex, follow" "$file" | wc -l)
        if [ "$after" -eq 0 ]; then
            echo "✓ 已修复: $file"
        else
            echo "⚠ 警告: $file 仍有noindex标签"
        fi
    fi
done

# 修复banjinjiagong页面
if [ -f "banjinjiagong.html" ]; then
    cp "banjinjiagong.html" "banjinjiagong.html.bak"
    sed -i '' 's/noindex, follow/index, follow/g' "banjinjiagong.html"
    echo "✓ 已修复: banjinjiagong.html"
fi

# 修复banjinjiagong相关页面
for suffix in _2.html _3.html _4.html; do
    if [ -f "banjinjiagong$suffix" ]; then
        cp "banjinjiagong$suffix" "banjinjiagong$suffix.bak"
        sed -i '' 's/noindex, follow/index, follow/g' "banjinjiagong$suffix"
        echo "✓ 已修复: banjinjiagong$suffix"
    fi
done

# 统计修复后数量
after=$(grep -r "noindex, follow" tags-*.html banjinjiagong.html banjinjiagong*.html 2>/dev/null | wc -l)
echo ""
echo "📊 修复后noindex标签数量: $after"
echo ""
echo "✅ 所有noindex标签修复完成！"
echo ""
echo "💡 提示："
echo "  - 已创建备份文件（.bak）"
echo "  - 请检查修复效果后删除备份文件"
echo "  - 下一步：配置301重定向规则"
