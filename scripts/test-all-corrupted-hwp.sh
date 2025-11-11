#!/bin/bash

# Test All Corrupted HWP Files
#
# Purpose: Convert all 8 HWP files from the 2 corrupted programs to PDF
# and save them to Desktop for manual inspection.

set -e

echo "================================================================================"
echo "TESTING ALL CORRUPTED HWP FILES"
echo "================================================================================"
echo ""
echo "This script will convert 8 HWP files to PDF and save them to your Desktop."
echo "You can then manually open the PDFs to verify if the conversion worked."
echo ""

OUTPUT_DIR="/Users/paulkim/Desktop/hwp-test-output"
mkdir -p "$OUTPUT_DIR"

echo "📂 Output directory: $OUTPUT_DIR"
echo ""

# Counter for tracking results
SUCCESS=0
FAILED=0

# Function to test conversion
test_conversion() {
  local INPUT_FILE="$1"
  local OUTPUT_NAME="$2"
  local OUTPUT_FILE="$OUTPUT_DIR/$OUTPUT_NAME"

  echo "────────────────────────────────────────────────────────────────────────────────"
  echo "Testing: $(basename "$INPUT_FILE")"
  echo "────────────────────────────────────────────────────────────────────────────────"

  if NODE_ENV=development npx tsx scripts/manual-hwp-to-pdf-test.ts "$INPUT_FILE" "$OUTPUT_FILE"; then
    echo "✅ SUCCESS"
    ((SUCCESS++))
  else
    echo "❌ FAILED"
    ((FAILED++))
  fi

  echo ""
}

# Program 1: 2025년 KISTEP 수탁사업 (4 files)
PROGRAM1_DIR="/Users/paulkim/Downloads/connect/data/ntis-attachments/20250101_to_20251031/page-1/announcement-1775"

test_conversion "$PROGRAM1_DIR/붙임1-1. 위탁연구 제안요구서_과기정통부 직할 출연(연) 특성을 고려한 평가 방안 연구.hwp" \
                "program1-file1-제안요구서.pdf"

test_conversion "$PROGRAM1_DIR/붙임2-1. (양식)위탁연구계획서.hwp" \
                "program1-file2-위탁연구계획서.pdf"

test_conversion "$PROGRAM1_DIR/붙임2-2. (규정)KISTEP 위탁연구관리지침(2023-11-27).hwp" \
                "program1-file3-관리지침.pdf"

test_conversion "$PROGRAM1_DIR/재공고문_2025년도 과학기술정보통신부 직할 출연(연) 및 국가과학기술연구회 기관평가.hwp" \
                "program1-file4-재공고문.pdf"

# Program 2: 첨단디스플레이국가연구플랫폼 (4 files)
PROGRAM2_DIR="/Users/paulkim/Downloads/connect/data/ntis-attachments/20250101_to_20251031/page-1/announcement-1776"

test_conversion "$PROGRAM2_DIR/[별첨1] 기술수요조사서.hwp" \
                "program2-file1-기술수요조사서.pdf"

test_conversion "$PROGRAM2_DIR/[별첨2] 테마별 설명 자료.hwp" \
                "program2-file2-테마별설명자료.pdf"

test_conversion "$PROGRAM2_DIR/[별첨3] 산업기술분류표(공통 운영요령 제16조 관련).hwp" \
                "program2-file3-산업기술분류표.pdf"

test_conversion "$PROGRAM2_DIR/첨단디스플레이국가연구플랫폼구축(가칭) 기술수요조사 공고(연장).hwp" \
                "program2-file4-수요조사공고.pdf"

# Summary
echo "================================================================================"
echo "CONVERSION SUMMARY"
echo "================================================================================"
echo "✅ Successful conversions: $SUCCESS/8"
echo "❌ Failed conversions: $FAILED/8"
echo ""
echo "📂 Output files saved to: $OUTPUT_DIR"
echo ""

if [ $FAILED -gt 0 ]; then
  echo "⚠️  Some conversions failed. These HWP files may:"
  echo "   • Be in an unsupported HWP format version"
  echo "   • Be corrupted"
  echo "   • Be encrypted or password-protected"
  echo "   • Require Hancom Tesseract OCR fallback"
  echo ""
fi

echo "You can now manually open the PDF files to verify their contents."
echo "================================================================================"
