#!/usr/bin/env python3
"""Corre en GitHub Actions (no en tu computadora). Reanuda la sesion de Garmin
guardada en el secret GARMIN_TOKENS, trae el resumen del dia y lo escribe en
garmin-today.json para que KalTrack lo lea desde la web estatica.

Nunca usa tu contrasena: si los tokens expiraron, falla con instrucciones
claras en vez de intentar iniciar sesion interactivamente (imposible en CI).
"""
import base64
import json
import os
import sys
import tarfile
import tempfile
from datetime import date, datetime, timezone

from garminconnect import Garmin


def load_token_dir():
    b64 = os.environ.get("GARMIN_TOKENS")
    if not b64:
        sys.exit("Falta el secret GARMIN_TOKENS. Corre scripts/garmin_login_setup.py localmente y sube el secret.")
    tmpdir = tempfile.mkdtemp()
    tar_path = os.path.join(tmpdir, "tokens.tar.gz")
    with open(tar_path, "wb") as f:
        f.write(base64.b64decode(b64))
    with tarfile.open(tar_path) as t:
        t.extractall(tmpdir)
    return tmpdir


def safe(label, fn, *a, **kw):
    try:
        return fn(*a, **kw)
    except Exception as e:
        print(f"aviso: {label} fallo: {e}", file=sys.stderr)
        return None


def dig(d, *path):
    cur = d
    for k in path:
        if not isinstance(cur, dict):
            return None
        cur = cur.get(k)
    return cur


def main():
    email = os.environ.get("GARMIN_EMAIL", "")
    token_dir = load_token_dir()
    client = Garmin(email, "")
    try:
        client.login(token_dir)
    except Exception as e:
        sys.exit(f"No se pudo reanudar la sesion de Garmin (tokens vencidos o invalidos): {e}\n"
                  f"Corre scripts/garmin_login_setup.py de nuevo y actualiza el secret GARMIN_TOKENS.")

    today = date.today().isoformat()
    summary = safe("get_user_summary", client.get_user_summary, today) or {}
    hr = safe("get_heart_rates", client.get_heart_rates, today) or {}
    sleep = safe("get_sleep_data", client.get_sleep_data, today) or {}
    steps_data = safe("get_steps_data", client.get_steps_data, today)

    sleep_seconds = dig(sleep, "dailySleepDTO", "sleepTimeSeconds")
    sleep_score = dig(sleep, "dailySleepDTO", "sleepScores", "overall", "value")

    step_goal = None
    if isinstance(steps_data, dict):
        step_goal = steps_data.get("dailyStepGoal")
    if step_goal is None:
        step_goal = summary.get("dailyStepGoal")

    out = {
        "date": today,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "activeKcal": summary.get("activeKilocalories"),
        "totalKcal": summary.get("totalKilocalories"),
        "steps": summary.get("totalSteps"),
        "stepGoal": step_goal,
        "restingHR": hr.get("restingHeartRate"),
        "sleepHours": round(sleep_seconds / 3600, 1) if sleep_seconds else None,
        "sleepScore": sleep_score,
    }

    with open("garmin-today.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print("garmin-today.json escrito:", out)


if __name__ == "__main__":
    main()
