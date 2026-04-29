#!/bin/sh
set -e

mc alias set local "$MINIO_ENDPOINT" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"

create_bucket() {
  BUCKET=$1
  if mc ls "local/$BUCKET" > /dev/null 2>&1; then
    echo "Bucket '$BUCKET' already exists, skipping."
  else
    mc mb "local/$BUCKET"
    echo "Bucket '$BUCKET' created."
  fi
  # Set bucket policy to private (access only via presigned URLs)
  mc anonymous set none "local/$BUCKET"
}

create_bucket "$MINIO_BUCKET_AVATARS"
create_bucket "$MINIO_BUCKET_CHAT"
create_bucket "$MINIO_BUCKET_KANBAN"

echo "MinIO bucket initialization complete."
