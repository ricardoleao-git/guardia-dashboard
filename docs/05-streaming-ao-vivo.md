# GuardIA Dashboard — Streaming Ao Vivo

**Versão:** 1.0.0 | **Última atualização:** 22 Jul 2026

## Visão Geral

O componente `LiveStream` é o núcleo do sistema de streaming ao vivo do GuardIA Dashboard. Ele suporta 4 protocolos de transporte com fallback automático, permitindo exibir feeds de câmeras IP em tempo real no mosaico de câmeras.

## Protocolos Suportados

### 1. WebRTC (Preferencial)

**Latência:** ~200ms | **Qualidade:** Alta | **Requer:** MediaServer backend

Fluxo de conexão:
1. Cria `RTCPeerConnection` com configuração ICE
2. Envia offer SDP via WebSocket para o servidor de signaling
3. Recebe answer SDP do servidor
4. Troca candidatos ICE
5. Stream de vídeo é anexado ao elemento `<video>` via `srcObject`

```typescript
const pc = new RTCPeerConnection({
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
});
pc.ontrack = (event) => {
  videoRef.current.srcObject = event.streams[0];
};
const offer = await pc.createOffer({ receiveVideo: true, receiveAudio: false });
await pc.setLocalDescription(offer);
// Enviar offer via WebSocket, receber answer
```

### 2. HLS (Compatível)

**Latência:** ~3-5s | **Qualidade:** Média-Alta | **Requer:** URL .m3u8

Suporte nativo em Safari/iOS. Em outros browsers, usa `hls.js` carregado dinamicamente.

```typescript
if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
  // Safari nativo
  videoRef.current.src = streamUrl;
} else {
  // hls.js para Chrome/Firefox/Edge
  const hls = new Hls({ lowLatencyMode: true });
  hls.loadSource(streamUrl);
  hls.attachMedia(videoRef.current);
}
```

### 3. MJPEG (Fallback Simples)

**Latência:** ~1s | **Qualidade:** Média | **Requer:** URL HTTP multipart

Stream MJPEG via elemento `<img>` com `src` apontando para endpoint HTTP da câmera.

```typescript
<img
  src={`${streamUrl}?t=${Date.now()}`}
  alt="MJPEG Stream"
  style={{ width: "100%", height: "100%", objectFit: "contain" }}
/>
```

### 4. Snapshot HTTP (Último Recurso)

**Latência:** Variável | **Qualidade:** Baixa | **Requer:** URL HTTP

Fallback que busca uma imagem estática da câmera com refresh periódico configurável (padrão: 5 segundos).

```typescript
const [snapshotUrl, setSnapshotUrl] = useState(
  `${streamUrl}?t=${Date.now()}`
);
useEffect(() => {
  const interval = setInterval(() => {
    setSnapshotUrl(`${streamUrl}?t=${Date.now()}`);
  }, refreshInterval);
  return () => clearInterval(interval);
}, [streamUrl, refreshInterval]);
```

## Fallback Automático

O componente implementa fallback em cascata:

```
WebRTC (tentativa) 
  → Falha? → HLS (tentativa)
    → Falha? → MJPEG (tentativa)
      → Falha? → Snapshot HTTP (sempre, se URL disponível)
        → Sem URL? → Placeholder demo (imagem estática)
```

## Interface Visual

### Estados do Componente

| Estado | Indicador Visual | Descrição |
|--------|------------------|-----------|
| **Connecting** | Spinner azul + "Conectando..." | Estabelecendo conexão |
| **Live** | Badge "LIVE" vermelho pulsante | Stream ativo |
| **Fallback** | Badge do protocolo ativo | Usando protocolo alternativo |
| **Offline** | Ícone de câmera off + "Offline" | Câmera indisponível |
| **Error** | Ícone de erro + mensagem | Falha na conexão |

### Overlays no Tile

- **Topo esquerdo:** Badge "CONNECT LIVE" + badge de protocolo (WebRTC/HLS/MJPEG) + badge "AI"
- **Topo direito:** Timestamp em tempo real (fonte monospace)
- **Inferior:** Nome da câmera + serial + contadores de eventos (facial, veículos)
- **Scanline effect:** Overlay sutil de linhas horizontais para visual NVR autêntico

### Controles no Hover

- **Expandir:** Abre o stream em tela cheia
- **Trocar protocolo:** Permite forçar um protocolo específico

## Configuração de Câmeras

Cada câmera no mock data inclui URLs de stream:

```typescript
{
  serial: "4C14F8PAJ",
  name: "Corredor COPA",
  channel: "D02",
  status: "online",
  location: "Bloco A - 2º Andar",
  streamUrl: "wss://media.example.com/cam/4C14F8PAJ",  // WebRTC
  hlsUrl: "https://media.example.com/cam/4C14F8PAJ/index.m3u8",  // HLS
  mjpegUrl: "https://camera.example.com:8080/video",  // MJPEG
  snapshotUrl: "https://camera.example.com/snapshot.jpg",  // Snapshot
  protocol: "webrtc",  // Protocolo preferido
}
```

## Integração com CameraMosaic

O `CameraMosaic` renderiza múltiplos `LiveStream` em grid:

- **Layouts:** 2x2 (4 tiles), 3x3 (9 tiles), 4x4 (16 tiles)
- **Toggle Live/Snapshot:** Alterna entre streaming e modo snapshot
- **Status bar:** Contadores de online/offline
- **Responsivo:** Tiles se redimensionam automaticamente

## Considerações de Performance

- WebRTC usa GPU para decodificação de vídeo
- HLS com `lowLatencyMode: true` reduz buffer
- MJPEG é leve mas consome mais banda (sem compressão inter-frame)
- Snapshot é o mais leve mas não é vídeo real
- Cleanup automático: ao desmontar componente, fecha PeerConnection e remove stream
- Limite recomendado: 16 tiles simultâneos (grid 4x4) para não degradar performance
