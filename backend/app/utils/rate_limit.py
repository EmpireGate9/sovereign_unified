import time
from collections import defaultdict

_hits = defaultdict(list)

def allow(key: str, limit: int = 60, window: int = 60) -> bool:
    now = time.time()
    bucket = int(now // window)
    k = (key, bucket)
    lst = _hits[k]
    lst.append(now)
    # cleanup old buckets
    for kk in list(_hits.keys()):
        if kk[1] < bucket-1:
            _hits.pop(kk, None)
    return len(lst) <= limit
