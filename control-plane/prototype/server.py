#!/usr/bin/env python3

import json
import mimetypes
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).parent.resolve()
DB_PATH = ROOT / "cloudcommand-prototype.db"


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = db()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS layers (
            slug TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            sort_order INTEGER NOT NULL,
            tint TEXT NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS modules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            layer_slug TEXT NOT NULL,
            slug TEXT NOT NULL UNIQUE,
            display_name TEXT NOT NULL,
            module_type TEXT NOT NULL,
            state TEXT NOT NULL,
            line_1 TEXT NOT NULL,
            line_2 TEXT NOT NULL,
            metadata_json TEXT NOT NULL DEFAULT '{}',
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(layer_slug) REFERENCES layers(slug)
        )
    """)

    cur.execute("SELECT COUNT(*) AS count FROM layers")
    if cur.fetchone()["count"] == 0:
        cur.executemany(
            "INSERT INTO layers (slug, label, sort_order, tint) VALUES (?, ?, ?, ?)",
            [
                ("applications", "applications", 10, "green"),
                ("resources", "resource classes", 20, "blue"),
                ("providers", "providers", 30, "violet"),
            ],
        )

    cur.execute("SELECT COUNT(*) AS count FROM modules")
    if cur.fetchone()["count"] == 0:
        seed_modules = [
            (
                "applications",
                "cloudcommand-core",
                "CloudCommand Core",
                "application",
                "available",
                "state: available",
                "resources: 6 bound",
                {"version": "0.1.0", "owner": "core"},
            ),
            (
                "applications",
                "cloudcommand-api",
                "CloudCommand API",
                "application",
                "syncing",
                "state: syncing",
                "resources: 7 bound",
                {"version": "0.1.0", "owner": "api"},
            ),
            (
                "applications",
                "billing-api",
                "Billing API",
                "application",
                "available",
                "state: available",
                "resources: 4 bound",
                {"version": "1.8.3", "owner": "lab"},
            ),
            (
                "resources",
                "compute.workload",
                "compute.workload",
                "resource class",
                "passing",
                "mapped: kubernetes/deployment",
                "health: passing",
                {"provider_kind": "kubernetes"},
            ),
            (
                "resources",
                "network.service",
                "network.service",
                "resource class",
                "passing",
                "mapped: kubernetes/service",
                "health: passing",
                {"provider_kind": "kubernetes"},
            ),
            (
                "resources",
                "runtime.secret",
                "runtime.secret",
                "resource class",
                "watched",
                "mapped: kubernetes/secret",
                "health: watched",
                {"provider_kind": "kubernetes"},
            ),
            (
                "providers",
                "kubernetes.local",
                "kubernetes.local",
                "provider",
                "reachable",
                "provider: local",
                "state: reachable",
                {"cluster": "local"},
            ),
            (
                "providers",
                "runtime.agent",
                "runtime.agent",
                "provider",
                "listening",
                "mode: evidence only",
                "state: listening",
                {"control": "none"},
            ),
            (
                "providers",
                "cloudcommand.core",
                "cloudcommand.core",
                "provider",
                "active",
                "policy: active",
                "decisions: local",
                {"decision_scope": "local"},
            ),
        ]

        cur.executemany(
            """
            INSERT INTO modules
              (layer_slug, slug, display_name, module_type, state, line_1, line_2, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (layer, slug, name, module_type, state, line_1, line_2, json.dumps(meta))
                for layer, slug, name, module_type, state, line_1, line_2, meta in seed_modules
            ],
        )

    conn.commit()
    conn.close()


def get_modules():
    conn = db()
    rows = conn.execute(
        """
        SELECT
          m.layer_slug,
          m.slug,
          m.display_name,
          m.module_type,
          m.state,
          m.line_1,
          m.line_2,
          m.metadata_json,
          m.updated_at,
          l.label AS layer_label,
          l.tint AS layer_tint,
          l.sort_order
        FROM modules m
        JOIN layers l ON l.slug = m.layer_slug
        ORDER BY l.sort_order, m.id
        """
    ).fetchall()
    conn.close()

    result = {
        "applications": [],
        "resources": [],
        "providers": [],
    }

    for row in rows:
        item = dict(row)
        item["metadata"] = json.loads(item.pop("metadata_json") or "{}")
        result[item["layer_slug"]].append(item)

    return {
        "layers": result,
    }


class Handler(BaseHTTPRequestHandler):
    def send_json(self, payload, status=200):
        body = json.dumps(payload, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/modules":
            self.send_json(get_modules())
            return

        if path == "/":
            path = "/index.html"

        file_path = (ROOT / path.lstrip("/")).resolve()

        if not str(file_path).startswith(str(ROOT)) or not file_path.exists() or not file_path.is_file():
            self.send_error(404, "File not found")
            return

        content_type, _ = mimetypes.guess_type(str(file_path))
        if content_type is None:
            content_type = "application/octet-stream"

        body = file_path.read_bytes()

        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer(("0.0.0.0", 8080), Handler)
    print("CloudCommand prototype server running at http://localhost:8080")
    print(f"SQLite database: {DB_PATH}")
    server.serve_forever()
