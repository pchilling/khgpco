#!/bin/bash

# 測試 Strapi API 的 curl 命令
echo "Testing Strapi API..."

# 替換為實際的事件 ID
EVENT_ID=1

# 創建註冊
curl -X POST http://localhost:1339/api/registrations \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "name": "Test User",
      "phone": "0912345678",
      "email": "test@example.com",
      "event": "'$EVENT_ID'"
    }
  }' \
  -v 