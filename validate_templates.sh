#!/bin/bash

# 验证所有命令和技能文件的 frontmatter 格式

echo "======================================"
echo "SpecForge 模板验证脚本"
echo "======================================"
echo ""

ERRORS=0
WARNINGS=0

# 检查命令文件
echo "检查 Workflow Commands..."
echo "--------------------------------------"

for file in templates/.specforge/commands/workflow/*/*.md; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        dirname=$(basename $(dirname "$file"))
        
        # 检查是否有 frontmatter
        if ! head -1 "$file" | grep -q "^---"; then
            echo "❌ 错误: $dirname/$filename 缺少 frontmatter"
            ERRORS=$((ERRORS + 1))
            continue
        fi
        
        # 检查必需字段
        for field in "name:" "type:" "description:" "version:" "author:"; do
            if ! grep -q "^$field" "$file"; then
                echo "❌ 错误: $dirname/$filename 缺少字段 $field"
                ERRORS=$((ERRORS + 1))
            fi
        done
        
        # 检查 Iron Law
        if ! grep -q "## Iron Law" "$file"; then
            echo "⚠️  警告: $dirname/$filename 缺少 Iron Law 部分"
            WARNINGS=$((WARNINGS + 1))
        fi
        
        # 检查完成衔接
        if ! grep -q "## Step.*完成衔接" "$file"; then
            echo "⚠️  警告: $dirname/$filename 缺少完成衔接步骤"
            WARNINGS=$((WARNINGS + 1))
        fi
        
        # 检查反规避提醒
        if ! grep -q "## 反规避提醒" "$file"; then
            echo "⚠️  警告: $dirname/$filename 缺少反规避提醒"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi
done

echo ""
echo "检查 Skills..."
echo "--------------------------------------"

# 检查技能文件
for file in templates/.specforge/skills/*/*/SKILL.md; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        skill_dir=$(basename $(dirname "$file"))
        category_dir=$(basename $(dirname $(dirname "$file")))
        
        # 检查是否有 frontmatter
        if ! head -1 "$file" | grep -q "^---"; then
            echo "❌ 错误: $category_dir/$skill_dir/$filename 缺少 frontmatter"
            ERRORS=$((ERRORS + 1))
            continue
        fi
        
        # 检查必需字段
        for field in "name:" "type:" "description:" "version:" "author:"; do
            if ! grep -q "^$field" "$file"; then
                echo "❌ 错误: $category_dir/$skill_dir/$filename 缺少字段 $field"
                ERRORS=$((ERRORS + 1))
            fi
        done
        
        # 检查 Iron Law
        if ! grep -q "## Iron Law" "$file"; then
            echo "⚠️  警告: $category_dir/$skill_dir/$filename 缺少 Iron Law 部分"
            WARNINGS=$((WARNINGS + 1))
        fi
        
        # 检查自检列表
        if ! grep -q "自检" "$file"; then
            echo "⚠️  警告: $category_dir/$skill_dir/$filename 缺少自检列表"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi
done

echo ""
echo "======================================"
echo "验证结果"
echo "======================================"
echo "错误数: $ERRORS"
echo "警告数: $WARNINGS"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo "✅ 所有文件验证通过！"
    exit 0
else
    echo "❌ 发现 $ERRORS 个错误，请修复后重试。"
    exit 1
fi
