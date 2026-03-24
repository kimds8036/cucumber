# 1. 전국초중등학교위치표준데이터.json 파일을 읽어서 학교명과 도로명주소를 추출하여 매칭
'''
import csv
import json
from pathlib import Path

# ── 입력 파일 경로 ──────────────────────────────────────────
CSV_PATH  = Path(r"C:/Users/sage6/Downloads/학교기본정보_2026년02월28일기준.csv") 
JSON_PATH = Path(r"C:/Users/sage6/Downloads/전국초중등학교위치표준데이터.json")

# ── 출력 파일 경로 ──────────────────────────────────────────
MERGED_CSV_PATH    = Path(r"C:/Users/sage6/Downloads/merged_schools_1st.csv")  
UNMATCHED_CSV_PATH = Path(r"C:/Users/sage6/Downloads/unmatched_schools_1st.csv") 

JSON_ADDRESS_KEY = "소재지도로명주소"
JSON_NAME_KEY    = "학교명"
JSON_ID_KEY      = "학교ID"
JSON_LAT_KEY     = "위도"
JSON_LNG_KEY     = "경도"

CSV_ADDRESS_HEADER = "도로명주소"
CSV_NAME_HEADER    = "학교명"


def normalize_address(raw):
    if not raw:
        return ""
    trimmed = " ".join(str(raw).strip().split())
    parts = trimmed.split(" ")
    return " ".join(parts[:2])


def make_key(name, addr):
    return f"{str(name or '').strip()}_{normalize_address(addr)}"


def parse_csv(path: Path):
    for enc in ("utf-8", "euc-kr"):
        try:
            text = path.read_text(encoding=enc, errors="strict")
            break
        except UnicodeDecodeError:
            continue
    else:
        text = path.read_text(encoding="euc-kr", errors="ignore")

    lines = [l for l in text.splitlines() if l.strip()]
    if not lines:
        return [], []

    reader = csv.reader(lines)
    it     = iter(reader)
    header = [c.lstrip("\ufeff").strip() for c in next(it, [])]
    rows   = [r for r in it if len(r) == len(header)]
    return header, rows


def main():
    print("--- 3차 머지 시작 ---")

    header, rows = parse_csv(CSV_PATH)
    print(f"CSV 행 수: {len(rows)}")

    try:
        address_idx = header.index(CSV_ADDRESS_HEADER)
    except ValueError:
        address_idx = next((i for i, c in enumerate(header) if CSV_ADDRESS_HEADER in c), -1)

    if address_idx == -1:
        raise RuntimeError(f"'{CSV_ADDRESS_HEADER}' 컬럼을 찾을 수 없습니다.")

    name_idx = header.index(CSV_NAME_HEADER)

    # JSON 로드 & 맵 구축
    data    = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    records = data.get("records", [])

    location_map = {}
    for rec in records:
        key = make_key(rec.get(JSON_NAME_KEY), rec.get(JSON_ADDRESS_KEY))
        if not key or key in location_map:
            continue
        sid, lat, lng = rec.get(JSON_ID_KEY), rec.get(JSON_LAT_KEY), rec.get(JSON_LNG_KEY)
        if None not in (sid, lat, lng):
            location_map[key] = {"schoolId": sid, "lat": lat, "lng": lng}

    print(f"JSON 맵 크기: {len(location_map)}")

    merged_rows, unmatched_rows = [], []
    empty_count, nomatch_count  = 0, 0

    for cols in rows:
        addr = cols[address_idx] if address_idx < len(cols) else ""
        name = cols[name_idx]    if name_idx    < len(cols) else ""
        key  = make_key(name, addr)

        if not key or key == "_":
            empty_count += 1
            unmatched_rows.append(cols)
            continue

        info = location_map.get(key)
        if info:
            merged_rows.append(cols + [info["schoolId"], info["lat"], info["lng"]])
        else:
            nomatch_count += 1
            unmatched_rows.append(cols)

    merged_header = header + ["학교ID", "위도", "경도"]

    with MERGED_CSV_PATH.open("w", encoding="utf-8", newline="") as f:
        csv.writer(f).writerows([merged_header] + merged_rows)

    with UNMATCHED_CSV_PATH.open("w", encoding="utf-8", newline="") as f:
        csv.writer(f).writerows([header] + unmatched_rows)

    print("--- 완료 ---")
    print(f"전체: {len(rows)}  매칭 성공: {len(merged_rows)}  실패: {len(unmatched_rows)}")
    print(f"  - 키 비어 있음: {empty_count}")
    print(f"  - JSON 미매칭: {nomatch_count}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("오류:", exc)
'''

# 2. 매칭되지 않은 학교 필터링
'''
import pandas as pd
import json

UNMATCHED_PATH = r"C:/Users/sage6/Downloads/unmatched_schools_1st.csv"
JSON_PATH      = r"C:/Users/sage6/Downloads/전국초중등학교위치표준데이터.json"
OUTPUT_PATH    = r"C:/Users/sage6/Downloads/unmatched_schools_filtered.csv"

ELEMENTARY_TYPES = {
    "초등학교",
    "각종학교(초)",
    "평생학교(초)-3년6학기",
    "평생학교(초)-4년12학기",
    "재외한국학교(초)",
}

# JSON 파일에서 (학교명 + 시도교육청명) 조합 추출  ← 수정
with open(JSON_PATH, encoding="utf-8") as f:
    data = json.load(f)
records = data.get("records", [])
json_keys = set(
    (str(rec["학교명"]), str(rec["시도교육청명"]))  # ← 수정
    for rec in records
    if "학교명" in rec and "시도교육청명" in rec      # ← 수정
)

df_unmatched = pd.read_csv(UNMATCHED_PATH, encoding="utf-8")
before = len(df_unmatched)

# 1) 초등학교 계열 제거
df_unmatched = df_unmatched[~df_unmatched["학교종류명"].isin(ELEMENTARY_TYPES)]

# 2) JSON에 없는 학교 제거 (학교명 + 시도교육청명 조합 기준)  ← 수정
df_unmatched["_key"] = list(zip(
    df_unmatched["학교명"].astype(str),
    df_unmatched["시도교육청명"].astype(str)  # ← 수정
))
df_unmatched = df_unmatched[df_unmatched["_key"].isin(json_keys)]
df_unmatched = df_unmatched.drop(columns=["_key"])

after = len(df_unmatched)

df_unmatched.to_csv(OUTPUT_PATH, index=False, encoding="utf-8")

print(f"처리 전: {before}")
print(f"처리 후: {after}")
print(f"제거된 행: {before - after}")
print(f"저장 완료: {OUTPUT_PATH}")
'''

# 3. 매칭되지 않은 학교 도로명주소 수정
'''
import pandas as pd

REGION_MAP = {
    '서울':  '서울특별시',
    '부산':  '부산광역시',
    '대구':  '대구광역시',
    '인천':  '인천광역시',
    '광주':  '광주광역시',
    '대전':  '대전광역시',
    '울산':  '울산광역시',
    '세종':  '세종특별자치시',
    '경기':  '경기도',
    '강원도': '강원특별자치도',
    '충북':  '충청북도',
    '충남':  '충청남도',
    '전남':  '전라남도',
    '전북':  '전라북도',
    '경남':  '경상남도',
    '경북':  '경상북도',
    '제주':  '제주특별자치도',
}

INPUT_PATH  = r'C:/Users/sage6/Downloads/unmatched_schools_filtered.csv'  # ← 수정
OUTPUT_PATH = r'C:/Users/sage6/Downloads/unmatched_schools_fixed.csv'      # ← 수정
ADDRESS_COL = '도로명주소'

df = pd.read_csv(INPUT_PATH, encoding='utf-8')

def fix_region(addr):
    if pd.isna(addr):
        return addr
    addr = str(addr).strip()
    first_token = addr.split(' ')[0]
    if first_token in REGION_MAP:
        addr = REGION_MAP[first_token] + addr[len(first_token):]
    return addr

df[ADDRESS_COL] = df[ADDRESS_COL].apply(fix_region)

df.to_csv(OUTPUT_PATH, index=False, encoding='utf-8')
print(f'완료: {OUTPUT_PATH}')
print(f'처리된 행 수: {len(df)}')
'''

# 4. 다시 매칭
'''
import csv
import json
from pathlib import Path

# ── 입력 파일 경로 ──────────────────────────────────────────
CSV_PATH  = Path(r"C:/Users/sage6/Downloads/unmatched_schools_fixed.csv") 
JSON_PATH = Path(r"C:/Users/sage6/Downloads/전국초중등학교위치표준데이터.json")

# ── 출력 파일 경로 ──────────────────────────────────────────
MERGED_CSV_PATH    = Path(r"C:/Users/sage6/Downloads/merged_schools_2nd.csv")  
UNMATCHED_CSV_PATH = Path(r"C:/Users/sage6/Downloads/unmatched_schools_2nd.csv") 

JSON_ADDRESS_KEY = "소재지도로명주소"
JSON_NAME_KEY    = "학교명"
JSON_ID_KEY      = "학교ID"
JSON_LAT_KEY     = "위도"
JSON_LNG_KEY     = "경도"

CSV_ADDRESS_HEADER = "도로명주소"
CSV_NAME_HEADER    = "학교명"


def normalize_address(raw):
    if not raw:
        return ""
    trimmed = " ".join(str(raw).strip().split())
    parts = trimmed.split(" ")
    return " ".join(parts[:2])


def make_key(name, addr):
    return f"{str(name or '').strip()}_{normalize_address(addr)}"


def parse_csv(path: Path):
    for enc in ("utf-8", "euc-kr"):
        try:
            text = path.read_text(encoding=enc, errors="strict")
            break
        except UnicodeDecodeError:
            continue
    else:
        text = path.read_text(encoding="euc-kr", errors="ignore")

    lines = [l for l in text.splitlines() if l.strip()]
    if not lines:
        return [], []

    reader = csv.reader(lines)
    it     = iter(reader)
    header = [c.lstrip("\ufeff").strip() for c in next(it, [])]
    rows   = [r for r in it if len(r) == len(header)]
    return header, rows


def main():
    print("--- 3차 머지 시작 ---")

    header, rows = parse_csv(CSV_PATH)
    print(f"CSV 행 수: {len(rows)}")

    try:
        address_idx = header.index(CSV_ADDRESS_HEADER)
    except ValueError:
        address_idx = next((i for i, c in enumerate(header) if CSV_ADDRESS_HEADER in c), -1)

    if address_idx == -1:
        raise RuntimeError(f"'{CSV_ADDRESS_HEADER}' 컬럼을 찾을 수 없습니다.")

    name_idx = header.index(CSV_NAME_HEADER)

    # JSON 로드 & 맵 구축
    data    = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    records = data.get("records", [])

    location_map = {}
    for rec in records:
        key = make_key(rec.get(JSON_NAME_KEY), rec.get(JSON_ADDRESS_KEY))
        if not key or key in location_map:
            continue
        sid, lat, lng = rec.get(JSON_ID_KEY), rec.get(JSON_LAT_KEY), rec.get(JSON_LNG_KEY)
        if None not in (sid, lat, lng):
            location_map[key] = {"schoolId": sid, "lat": lat, "lng": lng}

    print(f"JSON 맵 크기: {len(location_map)}")

    merged_rows, unmatched_rows = [], []
    empty_count, nomatch_count  = 0, 0

    for cols in rows:
        addr = cols[address_idx] if address_idx < len(cols) else ""
        name = cols[name_idx]    if name_idx    < len(cols) else ""
        key  = make_key(name, addr)

        if not key or key == "_":
            empty_count += 1
            unmatched_rows.append(cols)
            continue

        info = location_map.get(key)
        if info:
            merged_rows.append(cols + [info["schoolId"], info["lat"], info["lng"]])
        else:
            nomatch_count += 1
            unmatched_rows.append(cols)

    merged_header = header + ["학교ID", "위도", "경도"]

    with MERGED_CSV_PATH.open("w", encoding="utf-8", newline="") as f:
        csv.writer(f).writerows([merged_header] + merged_rows)

    with UNMATCHED_CSV_PATH.open("w", encoding="utf-8", newline="") as f:
        csv.writer(f).writerows([header] + unmatched_rows)

    print("--- 완료 ---")
    print(f"전체: {len(rows)}  매칭 성공: {len(merged_rows)}  실패: {len(unmatched_rows)}")
    print(f"  - 키 비어 있음: {empty_count}")
    print(f"  - JSON 미매칭: {nomatch_count}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("오류:", exc)
'''

# 5. 최종 매칭
'''
import csv
import json
from pathlib import Path

# ── 입력 파일 경로 ──────────────────────────────────────────
CSV_PATH  = Path(r"C:/Users/sage6/Downloads/unmatched_schools_2nd.csv") 
JSON_PATH = Path(r"C:/Users/sage6/Downloads/전국초중등학교위치표준데이터.json")

# ── 출력 파일 경로 ──────────────────────────────────────────
MERGED_CSV_PATH    = Path(r"C:/Users/sage6/Downloads/merged_schools_3rd.csv")  
UNMATCHED_CSV_PATH = Path(r"C:/Users/sage6/Downloads/unmatched_schools_3rd.csv") 

JSON_ADDRESS_KEY = "소재지도로명주소"
JSON_NAME_KEY    = "학교명"
JSON_ID_KEY      = "학교ID"
JSON_LAT_KEY     = "위도"
JSON_LNG_KEY     = "경도"

CSV_ADDRESS_HEADER = "도로명주소"
CSV_NAME_HEADER    = "학교명"


def normalize_address(raw):
    if not raw:
        return ""
    trimmed = " ".join(str(raw).strip().split())
    parts = trimmed.split(" ")
    return " ".join(parts[:2])


def make_key(name, addr):
    return f"{str(name or '').strip()}_{normalize_address(addr)}"


def parse_csv(path: Path):
    for enc in ("utf-8", "euc-kr"):
        try:
            text = path.read_text(encoding=enc, errors="strict")
            break
        except UnicodeDecodeError:
            continue
    else:
        text = path.read_text(encoding="euc-kr", errors="ignore")

    lines = [l for l in text.splitlines() if l.strip()]
    if not lines:
        return [], []

    reader = csv.reader(lines)
    it     = iter(reader)
    header = [c.lstrip("\ufeff").strip() for c in next(it, [])]
    rows   = [r for r in it if len(r) == len(header)]
    return header, rows


def main():
    print("--- 3차 머지 시작 ---")

    header, rows = parse_csv(CSV_PATH)
    print(f"CSV 행 수: {len(rows)}")

    try:
        address_idx = header.index(CSV_ADDRESS_HEADER)
    except ValueError:
        address_idx = next((i for i, c in enumerate(header) if CSV_ADDRESS_HEADER in c), -1)

    if address_idx == -1:
        raise RuntimeError(f"'{CSV_ADDRESS_HEADER}' 컬럼을 찾을 수 없습니다.")

    name_idx = header.index(CSV_NAME_HEADER)

    # JSON 로드 & 맵 구축
    data    = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    records = data.get("records", [])

    location_map = {}
    for rec in records:
        key = make_key(rec.get(JSON_NAME_KEY), rec.get(JSON_ADDRESS_KEY))
        if not key or key in location_map:
            continue
        sid, lat, lng = rec.get(JSON_ID_KEY), rec.get(JSON_LAT_KEY), rec.get(JSON_LNG_KEY)
        if None not in (sid, lat, lng):
            location_map[key] = {"schoolId": sid, "lat": lat, "lng": lng}

    print(f"JSON 맵 크기: {len(location_map)}")

    merged_rows, unmatched_rows = [], []
    empty_count, nomatch_count  = 0, 0

    for cols in rows:
        addr = cols[address_idx] if address_idx < len(cols) else ""
        name = cols[name_idx]    if name_idx    < len(cols) else ""
        key  = make_key(name, addr)

        if not key or key == "_":
            empty_count += 1
            unmatched_rows.append(cols)
            continue

        info = location_map.get(key)
        if info:
            merged_rows.append(cols + [info["schoolId"], info["lat"], info["lng"]])
        else:
            nomatch_count += 1
            unmatched_rows.append(cols)

    merged_header = header + ["학교ID", "위도", "경도"]

    with MERGED_CSV_PATH.open("w", encoding="utf-8", newline="") as f:
        csv.writer(f).writerows([merged_header] + merged_rows)

    with UNMATCHED_CSV_PATH.open("w", encoding="utf-8", newline="") as f:
        csv.writer(f).writerows([header] + unmatched_rows)

    print("--- 완료 ---")
    print(f"전체: {len(rows)}  매칭 성공: {len(merged_rows)}  실패: {len(unmatched_rows)}")
    print(f"  - 키 비어 있음: {empty_count}")
    print(f"  - JSON 미매칭: {nomatch_count}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("오류:", exc)
'''

# 5. 매칭된 학교 파일 병합 후 필터링
'''
import pandas as pd
import json

MERGED_1ST_PATH = r"C:/Users/sage6/Downloads/merged_schools_1st.csv"
MERGED_2ND_PATH = r"C:/Users/sage6/Downloads/merged_schools_2nd.csv"
MERGED_3RD_PATH = r"C:/Users/sage6/Downloads/merged_schools_3rd.csv"
OUTPUT_PATH     = r"C:/Users/sage6/Downloads/merged_schools_final.csv"

ELEMENTARY_TYPES = {
    "초등학교",
    "각종학교(초)",
    "평생학교(초)-3년6학기",
    "평생학교(초)-4년12학기",
    "재외한국학교(초)",
}

df = pd.concat([
    pd.read_csv(MERGED_1ST_PATH, encoding="utf-8"),
    pd.read_csv(MERGED_2ND_PATH, encoding="utf-8"),
    pd.read_csv(MERGED_3RD_PATH, encoding="utf-8"),
], ignore_index=True)

before = len(df)
df = df[~df["학교종류명"].isin(ELEMENTARY_TYPES)]
after = len(df)

df.to_csv(OUTPUT_PATH, index=False, encoding="utf-8")

print(f"1st 행 수: {len(pd.read_csv(MERGED_1ST_PATH, encoding='utf-8'))}")
print(f"2nd 행 수: {len(pd.read_csv(MERGED_2ND_PATH, encoding='utf-8'))}")
print(f"3rd 행 수: {len(pd.read_csv(MERGED_3RD_PATH, encoding='utf-8'))}")
print(f"병합 후: {before}")
print(f"초등학교 제거 후: {after} (제거: {before - after})")
print(f"저장 완료: {OUTPUT_PATH}")
'''

# 6. 최종 학교 파일 전처리 후 json 파일로 변환

import pandas as pd
import json

INPUT_PATH  = r"C:/Users/sage6/Downloads/merged_schools_final.csv"
OUTPUT_PATH = r"C:/Users/sage6/Downloads/merged_schools_final.json"

DROP_COLUMNS = [
    "영문학교명",
    "도로명우편번호",
    "팩스번호",
    "산업체특별학급존재여부",
    "특수목적고등학교계열명",
    "입시전후기구분명",
    "주야구분명",
    "설립일자",
]

df = pd.read_csv(INPUT_PATH, encoding="utf-8")

before_cols = df.columns.tolist()
df = df.drop(columns=DROP_COLUMNS, errors="ignore")
after_cols = df.columns.tolist()

result = df.to_dict(orient="records")

with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"삭제된 컬럼: {[c for c in before_cols if c not in after_cols]}")
print(f"남은 컬럼: {after_cols}")
print(f"총 레코드 수: {len(result)}")
print(f"저장 완료: {OUTPUT_PATH}")
