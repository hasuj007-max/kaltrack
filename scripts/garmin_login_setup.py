#!/usr/bin/env python3
"""EJECUTAR SOLO UNA VEZ, EN TU COMPUTADORA (nunca dentro de una sesion de un
asistente de IA ni compartiendo la salida). Inicia sesion interactiva en Garmin
Connect (te pedira el codigo MFA si tu cuenta lo tiene activado), guarda un
paquete de tokens de sesion, y te da los comandos exactos para subirlo como
secret de GitHub Actions.

Los tokens permiten sincronizar tus datos SIN guardar tu contrasena en ningun
lado. Aun asi, dan acceso de lectura a tu cuenta de Garmin: bórralos del disco
despues de subir el secret.
"""
import base64
import getpass
import os
import tarfile

from garminconnect import Garmin

TOKEN_DIR = os.path.expanduser("~/.garminconnect_kaltrack")


def main():
    email = input("Email de Garmin: ").strip()
    password = getpass.getpass("Contrasena de Garmin (no se muestra en pantalla): ")
    client = Garmin(
        email,
        password,
        prompt_mfa=lambda: input("Codigo MFA (Enter si tu cuenta no lo pide): "),
    )
    client.login(TOKEN_DIR)
    print(f"\nSesion guardada en {TOKEN_DIR}")

    tar_path = TOKEN_DIR.rstrip("/") + ".tar.gz"
    with tarfile.open(tar_path, "w:gz") as tar:
        tar.add(TOKEN_DIR, arcname=".")
    with open(tar_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()

    out_file = "garmin_tokens_b64.txt"
    with open(out_file, "w") as f:
        f.write(b64)

    print(f"\nBundle codificado guardado en ./{out_file}")
    print("\nAhora, desde la carpeta del repo y con GitHub CLI instalado (gh auth login si hace falta), sube los secrets:\n")
    print(f"  gh secret set GARMIN_TOKENS < {out_file}")
    print(f"  gh secret set GARMIN_EMAIL --body \"{email}\"")
    print(f"\nCuando confirmes que se subieron (gh secret list), BORRA lo local:")
    print(f"  rm -rf {TOKEN_DIR} {tar_path} {out_file}")


if __name__ == "__main__":
    main()
