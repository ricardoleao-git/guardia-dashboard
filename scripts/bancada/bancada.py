#!/usr/bin/env python3
"""
GuardIA — Roteiro de bancada executável.

Transcrição de `docs/spec/P6S-09_ROTEIRO-DE-BANCADA.md` §3 (probe) e §4
(safety code) em um comando. O objetivo é que o dado que destrava a Fase 2
não dependa de alguém copiar 30 comandos e anotar o resultado certo.

    python3 scripts/bancada/bancada.py probe
    python3 scripts/bancada/bancada.py safety-code
    python3 scripts/bancada/bancada.py all

As quatro regras do P6S-09 §1 estão aplicadas em código, não em comentário:

  1. Descoberta é GET-only. `safety-code` se recusa a rodar enquanto o backup
     do §3.6 não existir com tamanho > 0.
  2. Nunca contra equipamento de cliente. Alvos fora de 192.168.254.0/24 são
     recusados (`--allow-foreign-network` para sobrepor, conscientemente).
  3. Registra status HTTP e corpo por endpoint, e monta a matriz
     device × endpoint — o artefato mais valioso da sessão.
  4. Intervalo de 3 s entre escritas.

Autenticação: HTTP **Basic** (CLAUDE.md §4.1 — nunca Digest), `admin` com
senha vazia na bancada. Só na LAN.

> Este script é **sonda**, não connector. Não importa nem altera
> `p6s_client.py`/`main.py` — a regra dos dois connectors (CLAUDE.md §14.6)
> segue intacta.
"""
import argparse
import ipaddress
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from requests.auth import HTTPBasicAuth

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "connector" / "src"))
from p6s_safety_code import DeviceIdentity, UniqueCodeSource, all_candidates  # noqa: E402


# ---------------------------------------------------------------- alvos
# P6S-09 §2. Conflito aberto em D1 (PND-08): .115/H5AI-50 numa fonte,
# .106/CAM01 na outra, offline nas duas. O §3.3 resolve por evidência —
# o script não escolhe.
NVR = "192.168.254.116"   # RS-436MLJ-L2/S8, 36ch
T5A = "192.168.254.227"   # T5AI  — canal D4
T5B = "192.168.254.209"   # T5AI  — canal D6
F4C = "192.168.254.207"   # F4C-T — canal D5 (COPA)

BENCH_NETWORK = ipaddress.ip_network("192.168.254.0/24")
AUTH = HTTPBasicAuth("admin", "")
TIMEOUT = 10
WRITE_INTERVAL_S = 3      # P6S-09 §1 regra 4

OUT = Path("bancada")
BACKUP = OUT / "nvr-config-backup.bin"


# ---------------------------------------------------------------- infra
def guard_network(hosts, allow_foreign: bool) -> None:
    """P6S-09 §1 regra 2 — jamais rodar contra equipamento de cliente."""
    foreign = [h for h in hosts if ipaddress.ip_address(h) not in BENCH_NETWORK]
    if foreign and not allow_foreign:
        sys.exit(
            f"ABORTADO: {', '.join(foreign)} fora de {BENCH_NETWORK}.\n"
            "O roteiro é só para a bancada. Use --allow-foreign-network se "
            "souber exatamente o que está fazendo."
        )


def status_code_of(body: str):
    """`<ResponseStatus><statusCode>0` = sucesso (P6S-09 §1 regra 5)."""
    m = re.search(r"<statusCode>\s*(-?\d+)\s*</statusCode>", body or "")
    return int(m.group(1)) if m else None


def get(host: str, path: str, save_as: str = None, params=None):
    url = f"http://{host}{path}"
    rec = {"host": host, "path": path, "url": url}
    try:
        r = requests.get(url, auth=AUTH, timeout=TIMEOUT, params=params)
        rec.update(http=r.status_code, bytes=len(r.content),
                   status_code=status_code_of(r.text[:4000]))
        if save_as:
            (OUT / save_as).write_bytes(r.content)
            rec["saved"] = save_as
        rec["head"] = r.text[:400] if r.content[:1] in (b"<", b"{") else "<binário>"
    except Exception as e:
        rec.update(http=None, erro=str(e))
    return rec


def write(host: str, path: str, method: str, xml: str = None, files=None):
    """Escrita: respeita o intervalo do §1 regra 4."""
    url = f"http://{host}{path}"
    rec = {"host": host, "path": path, "method": method}
    try:
        kw = dict(auth=AUTH, timeout=TIMEOUT)
        if xml is not None:
            kw["data"] = xml.encode()
            kw["headers"] = {"Content-Type": "application/xml"}
        if files is not None:
            kw["files"] = files
        r = requests.request(method, url, **kw)
        rec.update(http=r.status_code, status_code=status_code_of(r.text[:4000]),
                   head=r.text[:400])
    except Exception as e:
        rec.update(http=None, erro=str(e))
    time.sleep(WRITE_INTERVAL_S)
    return rec


def show(rec: dict) -> None:
    tag = "ok " if rec.get("status_code") == 0 else "   "
    sc = rec.get("status_code")
    sc = f"statusCode={sc}" if sc is not None else ""
    print(f"  {tag}[{rec.get('http') or 'ERR'}] {rec['path']} {sc} {rec.get('erro','')}".rstrip())


# ---------------------------------------------------------------- §3 probe
def probe() -> dict:
    """P6S-09 §3 — GET-only. Avança PND-03, 08, 13, 14, 15."""
    print("\n=== §3 PROBE (GET-only) ===")
    r = {"quando": datetime.now(timezone.utc).isoformat(), "fase": "probe", "registros": []}

    def rec(x):
        r["registros"].append(x)
        show(x)
        return x

    print("\n-- 3.1 identidade e capacidades")
    rec(get(NVR, "/System/DeviceCap", "nvr-devicecap.xml"))
    rec(get(NVR, "/System/AICap", "nvr-aicap.xml"))
    rec(get(NVR, "/System/DeviceInfo", "nvr-info.xml"))

    print("\n-- matriz device × endpoint (§1 regra 3)")
    matriz = {}
    for host in (NVR, T5A, T5B, F4C):
        x = rec(get(host, "/System/DeviceCap"))
        matriz[host] = x.get("http")
    r["matriz_devicecap"] = matriz

    print("\n-- 3.2 disco (função exclusiva de gravador)")
    rec(get(NVR, "/Disk", "nvr-disk.xml"))

    print("\n-- 3.3 DeviceStatus → PND-08 (identidade real de D1, tipo de D4)")
    rec(get(NVR, "/System/DeviceStatus", "nvr-status.xml"))
    print("     ^ conferir no XML o IP/modelo que o NVR reporta para D1 e D4.")
    print("       O que o NVR reporta vence a config do protótipo.")

    print("\n-- 3.4 registro ativo porta 9000 → PND-15")
    rec(get(NVR, "/System/NVRRegisterCfg"))
    rec(get(NVR, "/System/NVRRegisterState"))

    print("\n-- 3.5 config por canal (LER, nunca escrever nesta fase)")
    rec(get(NVR, "/Record/1/RecordSchedule"))
    rec(get(NVR, "/Pictures/1/OSD"))

    print("\n-- 3.6 BACKUP OBRIGATÓRIO (destrava a fase de escrita)")
    b = rec(get(NVR, "/System/DeviceConfigFile", BACKUP.name, params={"FileType": 3}))
    if b.get("bytes", 0) > 0:
        print(f"     backup OK: {b['bytes']} bytes")
    else:
        print("     ⚠️  backup VAZIO — a fase safety-code vai se recusar a rodar.")

    print("\n-- 3.7 varredura de FileType → PND-03 (base facial do NVR é baixável?)")
    achados = []
    for n in range(21):
        x = get(NVR, "/System/DeviceConfigFile", f"ft-{n}.bin", params={"FileType": n})
        size = x.get("bytes", 0)
        if size > 0:
            achados.append({"file_type": n, "bytes": size})
            print(f"     FileType={n:<3} {size} bytes")
        else:
            (OUT / f"ft-{n}.bin").unlink(missing_ok=True)
    r["file_types_com_conteudo"] = achados
    if not achados:
        print("     nenhum FileType retornou conteúdo")
    print("     ^ inspecionar: file / xxd | head / strings | head")
    print("       procurar eTransferFileTypeFaceReco (PND-03) e eRecordSetFile")

    print("\n-- 3.8 fila de alarme (candidatos do backlog)")
    rec(get(NVR, "/EventPlay"))
    rec(get(NVR, "/AISnapshot"))

    print("\n-- 3.9 canais acima de 32 → PND-14")
    rec(get(NVR, "/Record/34/RecordSchedule"))
    rec(get(NVR, "/Pictures/34/OSD"))

    print("\n-- 3.10 PND-13 — NÃO automatizável")
    print("     Não há endpoint conhecido para adicionar IPC a canal nos 796 caminhos.")
    print("     Abrir DevTools na UI do NVR, adicionar uma câmera e ler a requisição real")
    print("     (P6S-09 §8). Colar aqui: bancada/pnd13-requisicao-da-ui.txt")
    r["pnd13"] = "manual — capturar no DevTools (P6S-09 §8)"

    return r


# ---------------------------------------------------------------- §4 safety code
def safety_code(target: str, ownner: str) -> dict:
    """
    P6S-09 §4 — PND-01 🔴. Testa as 4 hipóteses; a que retornar statusCode 0 vence.

    Faz escrita. Exige o backup do §3.6 (P6S-09 §1 regra 1).
    """
    print("\n=== §4 SAFETY CODE — PND-01 (bloqueia a Fase 2 inteira) ===")

    if not BACKUP.exists() or BACKUP.stat().st_size == 0:
        sys.exit(
            f"ABORTADO: {BACKUP} ausente ou vazio.\n"
            "P6S-09 §1 regra 1: nenhum PUT antes do backup do §3.6 existir.\n"
            "Rode `bancada.py probe` primeiro."
        )
    print(f"  backup presente ({BACKUP.stat().st_size} bytes) — escrita liberada")

    r = {"quando": datetime.now(timezone.utc).isoformat(), "fase": "safety-code",
         "alvo": target, "tentativas": []}

    # 4.1 — binding: grava o GuardIA como dono da biblioteca (1× por device)
    print(f"\n-- 4.1 binding do Ownner em {target}")
    b = write(target, "/FrontDeviceOwnnerInfo", "PUT",
              f"<FrontDeviceOwnnerInfo><Ownner>{ownner}</Ownner></FrontDeviceOwnnerInfo>")
    show(b)
    r["binding"] = b

    # colher a identidade que alimenta as 4 hipóteses
    info = get(target, "/System/DeviceInfo", "t5ai-info.xml")
    show(info)
    body = (OUT / "t5ai-info.xml").read_text(errors="replace") if info.get("bytes") else ""

    def tag(*names):
        for n in names:
            m = re.search(rf"<{n}>([^<]+)</{n}>", body, re.I)
            if m:
                return m.group(1).strip()
        return None

    identity = DeviceIdentity(
        ownner_binding=ownner,
        serial=tag("SerialNumber", "Serial", "SN"),
        did=tag("DID", "DeviceID"),
        mac=tag("MAC", "MacAddress", "MACAddress"),
    )
    print(f"     serial={identity.serial}  did={identity.did}  mac={identity.mac}")
    r["identidade"] = identity.__dict__.copy()

    # 4.2 — a MESMA string vai no XML e no MD5. Divergir aqui invalida o teste.
    system_time = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    candidatos = all_candidates(identity, system_time)
    r["system_time"] = system_time
    print(f"\n-- 4.2 SystemTime={system_time} · {len(candidatos)} hipóteses viáveis")
    for src, code in candidatos.items():
        print(f"     {src.value:<16} → {code}")

    # 4.3 — criar um grupo por hipótese; a que passar vence
    print("\n-- 4.3 criando grupo por hipótese")
    vencedora = None
    for src, code in candidatos.items():
        gid = f"guardia-pnd01-{src.value.replace('_','-')}"
        xml = (
            "<FaceGroup>"
            f"<GroupName>PND01-{src.value}</GroupName>"
            f"<GroupID2>{gid}</GroupID2>"
            f"<Ownner>{code}</Ownner>"
            f"<SystemTime>{system_time}</SystemTime>"
            "<GroupThresholdValue>80</GroupThresholdValue>"
            "</FaceGroup>"
        )
        x = write(target, "/FaceGroups/Create", "POST", xml)
        x["hipotese"] = src.value
        x["safety_code"] = code
        show(x)
        r["tentativas"].append(x)
        if x.get("status_code") == 0 and vencedora is None:
            vencedora = src

    r["vencedora"] = vencedora.value if vencedora else None
    print()
    if vencedora:
        print(f"  ✅ PND-01 FECHADA — unique_code = {vencedora.value}")
        print("     Próximo passo (1 linha):")
        print("       connector/src/p6s_safety_code.py → RESOLVED_UNIQUE_CODE_SOURCE = "
              f"UniqueCodeSource.{vencedora.name}")
        print("     E baixar PND-01 em docs/spec/05_Roadmap-e-Fases.md §6.")
    else:
        print("  ❌ Nenhuma das 4 hipóteses retornou statusCode 0.")
        print("     P6S-09 §8: abrir DevTools na UI local, cadastrar um rosto")
        print("     e ler a requisição real — a UI é cliente deste mesmo CGI.")
    return r


# ---------------------------------------------------------------- relatório
def escrever_relatorio(fases: list) -> Path:
    OUT.mkdir(exist_ok=True)
    (OUT / "resultado.json").write_text(json.dumps(fases, indent=2, ensure_ascii=False))

    L = ["# Bancada — resultado", "",
         f"Gerado em {datetime.now(timezone.utc).isoformat()}", ""]
    for f in fases:
        L += [f"## Fase `{f['fase']}`", ""]
        if f["fase"] == "probe":
            L += ["| device | /System/DeviceCap |", "|---|---|"]
            L += [f"| {h} | {v or 'sem resposta'} |" for h, v in f.get("matriz_devicecap", {}).items()]
            ft = f.get("file_types_com_conteudo", [])
            L += ["", f"**FileTypes com conteúdo (PND-03):** "
                      + (", ".join(f"{a['file_type']} ({a['bytes']}B)" for a in ft) if ft else "nenhum"), ""]
        if f["fase"] == "safety-code":
            L += ["| hipótese | safety code | HTTP | statusCode |", "|---|---|---|---|"]
            L += [f"| {t.get('hipotese')} | `{t.get('safety_code')}` | {t.get('http')} | "
                  f"{t.get('status_code')} |" for t in f.get("tentativas", [])]
            v = f.get("vencedora")
            L += ["", f"**Vencedora:** {v or 'nenhuma — ver P6S-09 §8'}", ""]
    L += ["", "> Ao fechar: atualizar `docs/spec/05_Roadmap-e-Fases.md` §6 e "
              "`P6S-01_ESTADO-ATUAL` §3–§4. Roteiro executado e não documentado "
              "é trabalho que se perde na próxima sessão (P6S-09 §9)."]
    p = OUT / "relatorio.md"
    p.write_text("\n".join(L))
    return p


def main():
    ap = argparse.ArgumentParser(description="Roteiro de bancada P6S-09 (executável)")
    ap.add_argument("fase", choices=["probe", "safety-code", "all"])
    ap.add_argument("--target", default=T5A, help=f"device do §4 (default {T5A})")
    ap.add_argument("--ownner", default="GUARDIA-TESTE01", help="Ownner do binding (§4.1)")
    ap.add_argument("--allow-foreign-network", action="store_true",
                    help="permitir alvo fora de 192.168.254.0/24 (P6S-09 §1 regra 2)")
    a = ap.parse_args()

    guard_network([NVR, T5A, T5B, F4C, a.target], a.allow_foreign_network)
    OUT.mkdir(exist_ok=True)

    fases = []
    if a.fase in ("probe", "all"):
        fases.append(probe())
    if a.fase in ("safety-code", "all"):
        fases.append(safety_code(a.target, a.ownner))

    print(f"\nRelatório: {escrever_relatorio(fases)}")


if __name__ == "__main__":
    main()
