#!/bin/bash

BASE_URL="http://localhost:8080"

echo "=== Casbin Authorization Server Test ==="
echo

# ヘルスチェック
echo "1. Health Check"
curl -s "$BASE_URL/health" | jq '.'
echo -e "\n"

# 現在のポリシーを取得
echo "2. Get Current Policies"
curl -s "$BASE_URL/policies" | jq '.'
echo -e "\n"

# 認可チェック - admin権限のjohn
echo "3. Authorization Check - john (admin) accessing /api/users"
curl -s -X POST "$BASE_URL/authorize" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "john",
    "object": "/api/users",
    "action": "GET"
  }' | jq '.'
echo -e "\n"

# 認可チェック - user権限のalice
echo "4. Authorization Check - alice (user) accessing /api/read"
curl -s -X POST "$BASE_URL/authorize" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "alice",
    "object": "/api/read",
    "action": "GET"
  }' | jq '.'
echo -e "\n"

# 認可チェック - 権限なしの場合
echo "5. Authorization Check - alice trying to access /api/admin"
curl -s -X POST "$BASE_URL/authorize" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "alice",
    "object": "/api/admin",
    "action": "POST"
  }' | jq '.'
echo -e "\n"

# 新しいポリシーを追加
echo "6. Add New Policy - bob can read posts"
curl -s -X POST "$BASE_URL/policies" \
  -H "Content-Type: application/json" \
  -d '{
    "policy": ["bob", "/api/posts", "GET"]
  }' | jq '.'
echo -e "\n"

# 追加されたポリシーで認可チェック
echo "7. Authorization Check - bob accessing /api/posts"
curl -s -X POST "$BASE_URL/authorize" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "bob",
    "object": "/api/posts",
    "action": "GET"
  }' | jq '.'
echo -e "\n"

# 更新されたポリシー一覧を確認
echo "8. Get Updated Policies"
curl -s "$BASE_URL/policies" | jq '.'
echo -e "\n"

echo "=== Test Completed ===" 