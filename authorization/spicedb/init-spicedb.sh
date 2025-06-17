#!/bin/bash

# SpiceDB初期化スクリプト

echo "Starting SpiceDB initialization process..."

# 環境変数の設定
export SPICEDB_GRPC_PRESHARED_KEY=${SPICEDB_GRPC_PRESHARED_KEY:-"spicedb-secret-key"}
export SPICEDB_DATASTORE_ENGINE=${SPICEDB_DATASTORE_ENGINE:-"postgres"}
export SPICEDB_DATASTORE_CONN_URI=${SPICEDB_DATASTORE_CONN_URI:-"postgres://spicedb:spicedb123@spicedb_postgres:5432/spicedb?sslmode=disable"}

# SpiceDBサーバーをバックグラウンドで起動
echo "Starting SpiceDB server..."
spicedb serve \
  --grpc-preshared-key "${SPICEDB_GRPC_PRESHARED_KEY}" \
  --http-enabled \
  --datastore-engine "${SPICEDB_DATASTORE_ENGINE}" \
  --datastore-conn-uri "${SPICEDB_DATASTORE_CONN_URI}" \
  --grpc-addr "0.0.0.0:50051" \
  --http-addr "0.0.0.0:8080" \
  --log-level "debug" &

# SpiceDBサーバーの起動を待機
echo "Waiting for SpiceDB server to start..."
sleep 10

# サーバーの起動確認
until curl -s -f http://localhost:8080/healthz > /dev/null 2>&1; do
  echo "Waiting for SpiceDB server..."
  sleep 2
done
echo "SpiceDB server is ready!"

# zedツールが利用可能かチェック
if ! command -v zed &> /dev/null; then
    echo "zed command not found, installing..."
    # zedツールのインストール（armまたはx86_64に対応）
    ARCH=$(uname -m)
    if [ "$ARCH" = "aarch64" ]; then
        ARCH="arm64"
    elif [ "$ARCH" = "x86_64" ]; then
        ARCH="amd64"
    fi
    
    curl -L "https://github.com/authzed/zed/releases/latest/download/zed-linux-${ARCH}" -o /usr/local/bin/zed
    chmod +x /usr/local/bin/zed
fi

# スキーマの書き込み
echo "Writing schema to SpiceDB..."
zed --endpoint="localhost:50051" --token="${SPICEDB_GRPC_PRESHARED_KEY}" --insecure schema write schema.zed

if [ $? -eq 0 ]; then
    echo "Schema written successfully!"
else
    echo "Failed to write schema"
    exit 1
fi

# YAMLファイルからリレーションシップの読み込みと書き込み
echo "Loading relationships from YAML file..."

# relationships.yamlを解析してSpiceDBにデータを投入
python3 -c "
import yaml
import json
import subprocess
import sys

# YAMLファイルを読み込み
with open('relationships.yaml', 'r') as f:
    data = yaml.safe_load(f)

relationships = data.get('relationships', [])
success_count = 0
fail_count = 0

for rel in relationships:
    resource = rel.get('resource', '')
    relation = rel.get('relation', '')
    subject = rel.get('subject', '')
    
    if not all([resource, relation, subject]):
        print(f'Skipping invalid relationship: {rel}')
        fail_count += 1
        continue
    
    # resource と subject の形式を SpiceDB用に変換
    # 'system:system1' -> 'system' type, 'system1' id
    resource_parts = resource.split(':', 1)
    subject_parts = subject.split(':', 1)
    
    if len(resource_parts) != 2 or len(subject_parts) != 2:
        print(f'Invalid resource or subject format: {rel}')
        fail_count += 1
        continue
    
    resource_type, resource_id = resource_parts
    subject_type, subject_id = subject_parts
    
    # zedコマンドでリレーションシップを作成
    cmd = [
        'zed', '--endpoint=localhost:50051', 
        '--token=${SPICEDB_GRPC_PRESHARED_KEY}', '--insecure',
        'relationship', 'create',
        f'{resource_type}:{resource_id}',
        relation,
        f'{subject_type}:{subject_id}'
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, shell=False)
        if result.returncode == 0:
            print(f'✓ Created: {resource} {relation} {subject}')
            success_count += 1
        else:
            print(f'✗ Failed: {resource} {relation} {subject} - {result.stderr}')
            fail_count += 1
    except Exception as e:
        print(f'✗ Error: {resource} {relation} {subject} - {str(e)}')
        fail_count += 1

print(f'\\nRelationship loading completed: {success_count} succeeded, {fail_count} failed')
"

# Python3がない場合のフォールバック（シェルスクリプトベース）
if [ $? -ne 0 ]; then
    echo "Python3 not available, using shell script fallback..."
    
    # シンプルなシェルスクリプトでYAMLを解析（基本的な形式のみ）
    grep -E '^\s*-\s*resource:' relationships.yaml | while read -r line; do
        # 簡単なYAML解析（完全ではない）
        resource=$(echo "$line" | sed -n 's/.*resource: *"\([^"]*\)".*/\1/p')
        relation=$(echo "$line" | sed -n 's/.*relation: *"\([^"]*\)".*/\1/p')  
        subject=$(echo "$line" | sed -n 's/.*subject: *"\([^"]*\)".*/\1/p')
        
        if [ -n "$resource" ] && [ -n "$relation" ] && [ -n "$subject" ]; then
            # リレーションシップを作成
            resource_type=$(echo "$resource" | cut -d: -f1)
            resource_id=$(echo "$resource" | cut -d: -f2)
            subject_type=$(echo "$subject" | cut -d: -f1)
            subject_id=$(echo "$subject" | cut -d: -f2)
            
            echo "Creating relationship: $resource_type:$resource_id $relation $subject_type:$subject_id"
            zed --endpoint="localhost:50051" --token="${SPICEDB_GRPC_PRESHARED_KEY}" --insecure \
                relationship create "$resource_type:$resource_id" "$relation" "$subject_type:$subject_id"
        fi
    done
fi

echo "SpiceDB initialization completed!"

# フォアグラウンドでサーバーを実行し続ける
echo "SpiceDB server running on:"
echo "  - gRPC: localhost:50051"
echo "  - HTTP: localhost:8080"
echo "Press Ctrl+C to stop the server"

# バックグラウンドプロセスをフォアグラウンドに移行
wait 