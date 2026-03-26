# -*- coding: utf-8 -*-
"""
두 학교 CSV 파일을 비교하여,
각 파일에만 있고 다른 파일에는 없는 학교를 찾습니다.

- 학교기본정보: 시도교육청명 + 학교명 기준
- 전국초중등학교위치표준데이터: 시도교육청명 + 학교명 기준
"""

import os
import sys
import pandas as pd


def load_basic_info(path, encoding="cp949"):
    """학교기본정보 CSV. 컬럼 순서: 시도교육청코드, 시도교육청명, 행정표준코드, 학교명, ..."""
    df = pd.read_csv(path, encoding=encoding)
    # 컬럼명이 인코딩 문제로 깨졌을 수 있음 → 위치로 키 컬럼 지정 (0=시도교육청코드, 1=시도교육청명, 2=행정표준코드, 3=학교명)
    if "시도교육청명" not in df.columns and len(df.columns) >= 4:
        df["시도교육청명"] = df.iloc[:, 1].astype(str).str.strip()
        df["학교명"] = df.iloc[:, 3].astype(str).str.strip()
    else:
        df["시도교육청명"] = df["시도교육청명"].astype(str).str.strip()
        df["학교명"] = df["학교명"].astype(str).str.strip()
    return df


def load_location_standard(path, encoding="cp949"):
    """전국초중등학교위치표준데이터 CSV. 컬럼: 학교ID, 학교명, ..., 시도교육청코드, 시도교육청명"""
    df = pd.read_csv(path, encoding=encoding)
    for col in ["시도교육청명", "학교명"]:
        if col not in df.columns:
            raise ValueError(f"컬럼 없음: {col}. 실제 컬럼: {list(df.columns)}")
    df["시도교육청명"] = df["시도교육청명"].astype(str).str.strip()
    df["학교명"] = df["학교명"].astype(str).str.strip()
    return df


def key_set(df, col1="시도교육청명", col2="학교명"):
    """(시도교육청명, 학교명) 집합. 공백/빈 문자열 제거."""
    keys = set()
    for _, row in df[[col1, col2]].drop_duplicates().iterrows():
        a, b = str(row[col1]).strip(), str(row[col2]).strip()
        if a and b and a != "nan" and b != "nan":
            keys.add((a, b))
    return keys


def main():
    path_basic = r"c:\Users\sage6\Downloads\학교기본정보_2026년02월28일기준.csv"
    path_location = r"c:\Users\sage6\Downloads\전국초중등학교위치표준데이터.csv"

    if len(sys.argv) >= 3:
        path_basic = sys.argv[1]
        path_location = sys.argv[2]

    print("파일 로딩 중...")
    try:
        df_basic = load_basic_info(path_basic)
        df_location = load_location_standard(path_location)
    except Exception as e:
        print(f"파일 로드 실패: {e}")
        sys.exit(1)

    set_basic = key_set(df_basic)
    set_location = key_set(df_location)

    only_in_basic = set_basic - set_location
    only_in_location = set_location - set_basic

    sorted_only_basic = sorted(only_in_basic, key=lambda x: (x[0], x[1]))
    sorted_only_location = sorted(only_in_location, key=lambda x: (x[0], x[1]))

    print("\n[1] 학교기본정보에는 있으나, 전국초중등학교위치표준데이터에는 없는 학교")
    print("-" * 60)
    if sorted_only_basic:
        for 시도, 학교 in sorted_only_basic:
            print(f"  {시도} | {학교}")
        print(f"총 {len(sorted_only_basic)}개")
    else:
        print("  없음")

    print("\n[2] 전국초중등학교위치표준데이터에는 있으나, 학교기본정보에는 없는 학교")
    print("-" * 60)
    if sorted_only_location:
        for 시도, 학교 in sorted_only_location:
            print(f"  {시도} | {학교}")
        print(f"총 {len(sorted_only_location)}개")
    else:
        print("  없음")

    print("\n요약: 학교기본정보 고유 (시도+학교명) 수 =", len(set_basic))
    print("      위치표준데이터 고유 (시도+학교명) 수 =", len(set_location))

    # 결과 CSV 저장 (한글 깨짐 방지, UTF-8 BOM)
    out_dir = os.path.dirname(path_basic)
    out1 = os.path.join(out_dir, "기본정보에만_있는_학교.csv")
    out2 = os.path.join(out_dir, "위치표준에만_있는_학교.csv")
    pd.DataFrame(sorted_only_basic, columns=["시도교육청명", "학교명"]).to_csv(out1, index=False, encoding="utf-8-sig")
    pd.DataFrame(sorted_only_location, columns=["시도교육청명", "학교명"]).to_csv(out2, index=False, encoding="utf-8-sig")
    print(f"\n결과 저장: {out1}")
    print(f"         {out2}")


if __name__ == "__main__":
    main()
