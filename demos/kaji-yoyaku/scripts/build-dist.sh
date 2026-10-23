#!/bin/sh
# 公開用に、サイトのファイルだけを dist/ に集める（notes・docs・tests は出さない）。
set -e
cd "$(dirname "$0")/.."
rm -rf dist
mkdir -p dist
cp ./*.html dist/
cp -r css js assets dist/
# 検索に載せない（各ページの meta noindex と二重に）
printf '/*\n  X-Robots-Tag: noindex, nofollow\n' > dist/_headers
echo "dist/ を作りました: $(find dist -type f | wc -l) files"
