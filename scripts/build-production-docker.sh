#!/bin/bash
set -e

#############################################################################
# Production Docker Build Script
#
# Purpose: Ensures correct cross-platform build (ARM Mac → x86 Linux)
# Usage: ./scripts/build-production-docker.sh [tag]
#
# ⚠️ CRITICAL: This script ALWAYS uses --platform linux/amd64
# Production server is x86_64, development is ARM64 (MacBook M4 Max)
#############################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Default tag or use argument
TAG="${1:-latest}"
IMAGE_NAME="connect:${TAG}"

echo "🏗️  Building Production Docker Image"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Platform:      linux/amd64 (x86_64)"
echo "Dockerfile:    Dockerfile.production"
echo "Image:         $IMAGE_NAME"
echo "Context:       $PROJECT_ROOT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if docker buildx is available
if ! docker buildx version >/dev/null 2>&1; then
    echo "❌ Error: docker buildx is not available"
    echo "   Install with: docker buildx install"
    exit 1
fi

# Build with correct platform
echo "🔨 Running: docker buildx build --platform linux/amd64 -f Dockerfile.production -t $IMAGE_NAME ."
echo ""

docker buildx build \
    --platform linux/amd64 \
    --file Dockerfile.production \
    --tag "$IMAGE_NAME" \
    --progress=plain \
    .

BUILD_EXIT_CODE=$?

echo ""
if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo "✅ Build succeeded!"
    echo ""
    echo "📋 Image Details:"
    docker images "$IMAGE_NAME" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"

    echo ""
    echo "🔍 Verifying Architecture:"
    ARCH=$(docker inspect "$IMAGE_NAME" --format='{{.Architecture}}')
    OS=$(docker inspect "$IMAGE_NAME" --format='{{.Os}}')

    echo "   OS:           $OS"
    echo "   Architecture: $ARCH"

    if [ "$ARCH" != "amd64" ]; then
        echo ""
        echo "⚠️  WARNING: Image architecture is $ARCH, expected amd64"
        echo "   This image may not work on production server!"
        exit 1
    fi

    echo ""
    echo "✅ Architecture verified: linux/amd64"
    echo ""
    echo "Next steps:"
    echo "  1. Test locally:  docker run --rm $IMAGE_NAME node --version"
    echo "  2. Tag for push:  docker tag $IMAGE_NAME connect:$(git rev-parse --short HEAD)"
    echo "  3. Deploy:        git push origin main (triggers GitHub Actions)"
else
    echo "❌ Build failed with exit code $BUILD_EXIT_CODE"
    exit $BUILD_EXIT_CODE
fi
