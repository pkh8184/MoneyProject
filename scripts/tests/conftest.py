import sys
from pathlib import Path

# 스크립트 루트를 sys.path에 추가 (import 편의)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
