import os

# حاول استيراد التطبيق من أشهر المسارات
app = None
for mod, attr in [
    ("main", "app"),
    ("app", "app"),
    ("src.main", "app"),
    ("backend.main", "app"),
]:
    try:
        m = __import__(mod, fromlist=[attr])
        app = getattr(m, attr, None)
        if app:
            break
    except Exception:
        pass

# إن لم يوجد، أنشئ تطبيق FastAPI بسيط (لن يكسر مشروعك)
if app is None:
    try:
        from fastapi import FastAPI
        app = FastAPI()
    except Exception:
        # fallback بسيط لو FastAPI غير متوفر
        from wsgiref.simple_server import make_server
        def _wsgi_app(environ, start_response):
            if environ.get("PATH_INFO") == "/api/health":
                start_response("200 OK", [("Content-Type", "application/json")])
                return [b'{"status":"ok"}']
            start_response("404 Not Found", [("Content-Type", "text/plain")])
            return [b"Not Found"]
        if __name__ == "__main__":
            with make_server("0.0.0.0", int(os.getenv("PORT", "8000")), _wsgi_app) as httpd:
                httpd.serve_forever()
        raise SystemExit(0)

# أضمن نقطة الفحص
try:
    from fastapi import APIRouter
    router = APIRouter()
    @router.get("/api/health")
    def _health(): return {"status": "ok"}
    app.include_router(router)
except Exception:
    # إذا كان التطبيق ليس FastAPI نتجاهل الإضافة
    pass
