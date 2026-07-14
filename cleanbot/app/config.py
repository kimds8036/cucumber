import os

# korcen 필터 설정
# "korean": 한국어 카테고리만 (채팅용 기본값, english 오탐 방지)
# "all": 외국어 포함 전체 (마스킹 후 english 오탐 가능성 있음)
# 그 외: "general", "sexual" 등 단일 레벨
FILTER_LEVEL = os.environ.get("KORCEN_FILTER_LEVEL", "korean")
