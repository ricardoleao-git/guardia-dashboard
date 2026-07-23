#!/usr/bin/env python3
"""
GuardIA — Backup Automático do Supabase
Exporta as tabelas camera_events, profiles, audit_logs e search_presets
para arquivos JSON e CSV, e faz upload para o Storage bucket 'backups'.

Uso:
  python3 backup_supabase.py                    # Backup completo
  python3 backup_supabase.py --days 7           # Últimos 7 dias apenas
  python3 backup_supabase.py --upload           # Upload para Storage
  python3 backup_supabase.py --cleanup 30       # Remove backups > 30 dias

Cron (backup diário às 03h):
  0 3 * * * /usr/bin/python3 /opt/guardia/scripts/backup_supabase.py --upload --cleanup 30 >> /var/log/guardia-backup.log 2>&1
"""
import argparse
import json
import csv
import os
import sys
from datetime import datetime, timedelta, timezone
from io import StringIO, BytesIO

import psycopg2
import requests

# ===== Configuração =====
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://ycqrgrczrunvyivxfnch.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", os.environ.get("SUPABASE_ANON_KEY", os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")))
DB_HOST = os.environ.get("SUPABASE_DB_HOST", "aws-0-us-east-1.pooler.supabase.com")
DB_PORT = int(os.environ.get("SUPABASE_DB_PORT", "6543"))
DB_NAME = os.environ.get("SUPABASE_DB_NAME", "postgres")
DB_USER = os.environ.get("SUPABASE_DB_USER", "postgres.ycqrgrczrunvyivxfnch")
DB_PASS = os.environ.get("SUPABASE_DB_PASS", "Zenitetech2026!")

TABLES = ["camera_events", "profiles", "audit_logs", "search_presets"]
BACKUP_DIR = os.environ.get("BACKUP_DIR", "./backups")


def connect_db():
    """Conecta ao Postgres do Supabase via pooler."""
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        sslmode="require",
        connect_timeout=15,
    )


def export_table_json(conn, table: str, days: int = None) -> list:
    """Exporta uma tabela como lista de dicionários (JSON)."""
    cur = conn.cursor()
    query = f"SELECT row_to_json(t) FROM (SELECT * FROM {table}"
    if days:
        query += f" WHERE created_at >= NOW() - INTERVAL '{days} days'"
    query += " ORDER BY created_at DESC) t"
    cur.execute(query)
    rows = cur.fetchall()
    cur.close()
    return [row[0] for row in rows]


def export_table_csv(conn, table: str, days: int = None) -> str:
    """Exporta uma tabela como CSV string."""
    cur = conn.cursor()
    query = f"SELECT * FROM {table}"
    if days:
        query += f" WHERE created_at >= NOW() - INTERVAL '{days} days'"
    query += " ORDER BY created_at DESC"
    cur.execute(query)
    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(columns)
    for row in rows:
        writer.writerow([str(v) if v is not None else "" for v in row])
    cur.close()
    return output.getvalue()


def save_backup(data: dict, table: str, fmt: str = "json") -> str:
    """Salva o backup em arquivo local."""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"{BACKUP_DIR}/{table}_{timestamp}.{fmt}"
    with open(filename, "w" if fmt == "json" else "w", encoding="utf-8") as f:
        if fmt == "json":
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        else:
            f.write(data)
    print(f"  Salvo: {filename} ({os.path.getsize(filename)} bytes)")
    return filename


def upload_to_storage(filepath: str, bucket: str = "backups") -> bool:
    """Faz upload do arquivo de backup para o Supabase Storage."""
    if not SUPABASE_KEY:
        print("  AVISO: SUPABASE_KEY não configurada, pulando upload")
        return False

    filename = os.path.basename(filepath)
    date_prefix = datetime.now(timezone.utc).strftime("%Y/%m/%d")
    storage_path = f"{date_prefix}/{filename}"

    with open(filepath, "rb") as f:
        resp = requests.post(
            f"{SUPABASE_URL}/storage/v1/object/{bucket}/{storage_path}",
            data=f.read(),
            headers={
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "apikey": SUPABASE_KEY,
                "Content-Type": "application/octet-stream",
                "x-upsert": "true",
            },
            timeout=60,
        )

    if resp.status_code in (200, 201):
        print(f"  Upload OK: {bucket}/{storage_path}")
        return True
    else:
        print(f"  Upload falhou ({resp.status_code}): {resp.text[:200]}")
        return False


def cleanup_old_backups(conn, days: int = 30):
    """Remove backups mais antigos que N dias do Storage."""
    print(f"\nLimpando backups > {days} dias...")
    # Lista arquivos locais antigos
    if os.path.exists(BACKUP_DIR):
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        for filename in os.listdir(BACKUP_DIR):
            filepath = os.path.join(BACKUP_DIR, filename)
            if os.path.getmtime(filepath) < cutoff.timestamp():
                os.remove(filepath)
                print(f"  Removido: {filename}")


def main():
    parser = argparse.ArgumentParser(description="GuardIA — Backup do Supabase")
    parser.add_argument("--days", type=int, default=None, help="Backup dos últimos N dias apenas")
    parser.add_argument("--upload", action="store_true", help="Upload para Supabase Storage")
    parser.add_argument("--cleanup", type=int, default=None, help="Remove backups > N dias")
    parser.add_argument("--format", choices=["json", "csv", "both"], default="both")
    args = parser.parse_args()

    print("=" * 60)
    print("GuardIA — Backup do Supabase")
    print(f"  Data: {datetime.now(timezone.utc).isoformat()}")
    print(f"  Tabelas: {', '.join(TABLES)}")
    if args.days:
        print(f"  Período: últimos {args.days} dias")
    print("=" * 60)

    conn = connect_db()
    conn.autocommit = True

    total_records = 0
    files_created = []

    for table in TABLES:
        print(f"\n[{table}]")
        try:
            if args.format in ("json", "both"):
                data = export_table_json(conn, table, args.days)
                filepath = save_backup(data, table, "json")
                files_created.append(filepath)
                total_records += len(data)
                print(f"  Registros: {len(data)}")

            if args.format in ("csv", "both"):
                csv_data = export_table_csv(conn, table, args.days)
                filepath = save_backup(csv_data, table, "csv")
                files_created.append(filepath)

        except Exception as e:
            print(f"  ERRO: {e}")

    conn.close()

    # Upload para Storage
    if args.upload:
        print("\n[Upload para Storage]")
        for filepath in files_created:
            upload_to_storage(filepath)

    # Cleanup
    if args.cleanup:
        cleanup_old_backups(conn if False else None, args.cleanup)

    print(f"\n{'=' * 60}")
    print(f"Backup completo! {total_records} registros em {len(files_created)} arquivos.")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
