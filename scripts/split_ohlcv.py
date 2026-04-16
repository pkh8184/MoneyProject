"""
ohlcv.json (단일 대용량) → ohlcv/{code}.json (종목별) 분할.

반드시 calculate_indicators / calculate_pattern_stats 이후 실행 (둘 다 ohlcv.json 읽음).
분할 후 원본 ohlcv.json 삭제 → GitHub 100MB 한도 회피.
"""
import json
import sys
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / 'public' / 'data'


def main():
    ohlcv_path = DATA_DIR / 'ohlcv.json'
    if not ohlcv_path.exists():
        print('[ERROR] ohlcv.json missing. Run fetch_stocks.py first.', file=sys.stderr)
        sys.exit(1)

    ohlcv_dir = DATA_DIR / 'ohlcv'
    ohlcv_dir.mkdir(exist_ok=True)

    print('[INFO] Loading ohlcv.json...')
    data = json.loads(ohlcv_path.read_text(encoding='utf-8'))

    # 이전 실행 잔존 파일 정리
    removed = 0
    for existing in ohlcv_dir.glob('*.json'):
        existing.unlink()
        removed += 1
    if removed:
        print(f'[INFO] Cleaned up {removed} stale files')

    count = 0
    fail_count = 0
    total = len(data)
    for code, stock_data in data.items():
        try:
            out_path = ohlcv_dir / f'{code}.json'
            out_path.write_text(
                json.dumps(stock_data, ensure_ascii=False, separators=(',', ':')),
                encoding='utf-8'
            )
            count += 1
        except Exception as e:
            print(f'[WARN] Failed to write {code}: {e}', file=sys.stderr)
            fail_count += 1
        if count > 0 and count % 500 == 0:
            print(f'[INFO] Split {count} / {total}')

    ohlcv_path.unlink()
    print(f'[INFO] Split complete: {count} files ({fail_count} failed)')
    print('[INFO] Removed ohlcv.json (replaced by ohlcv/ directory)')


if __name__ == '__main__':
    main()
