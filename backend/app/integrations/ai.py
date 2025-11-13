def simple_parse_text(content: bytes, mime: str) -> dict:
    text = content.decode("utf-8", errors="ignore")
    return {"mime": mime, "chars": len(text), "preview": text[:200]}
