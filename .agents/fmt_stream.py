# -*- coding: utf-8 -*-
"""Convierte la salida stream-json de Antigravity CLI en líneas legibles para el registro en vivo."""
import sys, json, time

def hora():
    return time.strftime("%H:%M:%S")

def emit(s):
    sys.stdout.write(f"[{hora()}] {s}\n"); sys.stdout.flush()

def walk(obj, depth=0):
    """Busca de forma genérica campos útiles en el evento."""
    if isinstance(obj, dict):
        t = obj.get("type") or obj.get("event") or obj.get("kind")
        name = obj.get("name") or obj.get("tool") or obj.get("tool_name")
        summary = obj.get("toolSummary") or obj.get("summary") or obj.get("title")
        text = obj.get("text") or obj.get("content") or obj.get("message") or obj.get("result")
        cmd = obj.get("CommandLine") or obj.get("command")
        path = obj.get("TargetFile") or obj.get("path") or obj.get("file_path") or obj.get("AbsolutePath")
        parts = []
        if t: parts.append(str(t))
        if name: parts.append(f"herramienta={name}")
        if summary: parts.append(str(summary)[:140])
        if cmd: parts.append("cmd: " + str(cmd)[:160])
        if path: parts.append("archivo: " + str(path)[-90:])
        if text and isinstance(text, str) and not cmd and not path:
            parts.append(text.strip().replace("\n", " ")[:220])
        if parts and depth <= 2:
            emit(" · ".join(parts))
        for v in obj.values():
            if isinstance(v, (dict, list)):
                walk(v, depth + 1)
    elif isinstance(obj, list):
        for v in obj:
            walk(v, depth + 1)

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        obj = json.loads(line)
    except Exception:
        emit(line[:300]); continue
    walk(obj)
