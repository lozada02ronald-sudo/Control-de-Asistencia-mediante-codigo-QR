import base64
import io
import json
from datetime import datetime
from pathlib import Path
from typing import Literal, Optional

import qrcode
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageDraw, ImageFont
from pydantic import BaseModel, Field
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.colormasks import RadialGradiantColorMask, SolidFillColorMask
from qrcode.image.styles.moduledrawers import (
    CircleModuleDrawer,
    GappedSquareModuleDrawer,
    RoundedModuleDrawer,
    SquareModuleDrawer,
)

app = FastAPI(
    title="AcadeQR Python Engine",
    description="Motor Python con qrcode + Pillow para generación de códigos QR personalizados y registro de asistencia.",
    version="2.5.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = Path(__file__).parent / "attendance_db.json"


def hex_to_rgb(hex_color: str, fallback: tuple[int, int, int] = (15, 23, 42)) -> tuple[int, int, int]:
    cleaned = hex_color.strip().lstrip("#")
    if len(cleaned) == 3:
        cleaned = "".join(c * 2 for c in cleaned)
    if len(cleaned) != 6:
        return fallback
    try:
        return (int(cleaned[0:2], 16), int(cleaned[2:4], 16), int(cleaned[4:6], 16))
    except ValueError:
        return fallback


def load_db() -> list[dict]:
    if not DB_PATH.exists():
        return []
    try:
        return json.loads(DB_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []


def save_db(records: list[dict]) -> None:
    DB_PATH.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")


class QrGenerateRequest(BaseModel):
    data: str = Field(..., min_length=1, max_length=2048)
    style: Literal["square", "rounded", "dots", "gapped"] = "rounded"
    fg_color: str = "#0f172a"
    bg_color: str = "#ffffff"
    gradient_color: Optional[str] = None
    badge_text: Optional[str] = Field(default=None, max_length=10)
    size: int = Field(default=420, ge=180, le=1024)


class AttendanceRegisterRequest(BaseModel):
    session_id: str
    cohort_code: str
    learner_id: str
    learner_name: str
    national_id: str
    token_used: str
    method: str
    distance_meters: int
    status: Literal["PRESENT", "LATE", "DENIED"]


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "engine": "Python 3 + FastAPI + qrcode + Pillow",
        "libraries": ["qrcode", "Pillow", "FastAPI"],
    }


@app.post("/api/qr/generate")
def generate_custom_qr(req: QrGenerateRequest):
    try:
        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=12,
            border=3,
        )
        qr.add_data(req.data)
        qr.make(fit=True)

        drawers = {
            "square": SquareModuleDrawer(),
            "rounded": RoundedModuleDrawer(),
            "dots": CircleModuleDrawer(),
            "gapped": GappedSquareModuleDrawer(),
        }
        module_drawer = drawers.get(req.style, RoundedModuleDrawer())

        fg_rgb = hex_to_rgb(req.fg_color, (15, 23, 42))
        bg_rgb = hex_to_rgb(req.bg_color, (255, 255, 255))

        if req.gradient_color:
            edge_rgb = hex_to_rgb(req.gradient_color, fg_rgb)
            color_mask = RadialGradiantColorMask(
                back_color=bg_rgb,
                center_color=fg_rgb,
                edge_color=edge_rgb,
            )
        else:
            color_mask = SolidFillColorMask(
                back_color=bg_rgb,
                front_color=fg_rgb,
            )

        pil_img = qr.make_image(
            image_factory=StyledPilImage,
            module_drawer=module_drawer,
            color_mask=color_mask,
        ).convert("RGBA")

        pil_img = pil_img.resize((req.size, req.size), Image.Resampling.LANCZOS)

        # Optional high-contrast center institutional badge (safe under ERROR_CORRECT_H)
        if req.badge_text and req.badge_text.strip():
            badge = req.badge_text.strip().upper()[:8]
            draw = ImageDraw.Draw(pil_img)
            cx, cy = req.size // 2, req.size // 2
            bw = max(int(req.size * 0.22), len(badge) * 14 + 24)
            bh = int(req.size * 0.12)
            x0, y0 = cx - bw // 2, cy - bh // 2
            x1, y1 = cx + bw // 2, cy + bh // 2

            draw.rounded_rectangle(
                [x0 - 4, y0 - 4, x1 + 4, y1 + 4],
                radius=12,
                fill=(*bg_rgb, 255),
            )
            draw.rounded_rectangle(
                [x0, y0, x1, y1],
                radius=10,
                fill=(*fg_rgb, 255),
            )

            font = ImageFont.load_default()
            bbox = draw.textbbox((0, 0), badge, font=font)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            draw.text(
                (cx - tw / 2, cy - th / 2 - 1),
                badge,
                fill=(255, 255, 255, 255),
                font=font,
            )

        buffer = io.BytesIO()
        pil_img.save(buffer, format="PNG")
        encoded = base64.b64encode(buffer.getvalue()).decode("ascii")

        return {
            "image_base64": f"data:image/png;base64,{encoded}",
            "format": "png",
            "engine": "python-qrcode-pillow",
            "style": req.style,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error generando QR en Python: {exc}") from exc


@app.get("/api/attendance/records")
def list_attendance_records():
    return {"records": load_db()}


@app.post("/api/attendance/register")
def register_attendance(req: AttendanceRegisterRequest):
    records = load_db()
    entry = {
        "id": f"py-{int(datetime.now().timestamp() * 1000)}",
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "date": datetime.now().strftime("%Y-%m-%d"),
        "session_id": req.session_id,
        "cohort_code": req.cohort_code,
        "learner_id": req.learner_id,
        "learner_name": req.learner_name,
        "national_id": req.national_id,
        "token_used": req.token_used,
        "method": req.method,
        "distance_meters": req.distance_meters,
        "status": req.status,
    }
    records.insert(0, entry)
    save_db(records[:200])
    return {"ok": True, "record": entry}

