import sys
from pathlib import Path

# 스크립트 루트를 sys.path에 추가 (import 편의)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
# 테스트 디렉토리도 sys.path에 추가 (fixtures 모듈 import용)
sys.path.insert(0, str(Path(__file__).resolve().parent))
