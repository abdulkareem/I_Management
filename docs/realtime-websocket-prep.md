# Real-time Dashboard WebSocket Preparation (Optional)

## Railway backend (Express + Socket.io)

```ts
import { createServer } from 'node:http';
import express from 'express';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

io.on('connection', (socket) => {
  console.log('client connected', socket.id);
});

export function emitDashboardUpdate(payload: { type: 'vacancy' | 'application' | 'stats'; data: unknown }) {
  io.emit('dashboard-update', payload);
}

server.listen(process.env.PORT || 3001);
```

Emit `dashboard-update` after creating/updating vacancies or applications.

## Frontend listener

```ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getDashboardSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_BASE_URL!, {
      transports: ['websocket'],
    });
  }

  return socket;
}
```

```ts
useEffect(() => {
  const socket = getDashboardSocket();
  const onUpdate = () => {
    void refetchDashboard();
  };

  socket.on('dashboard-update', onUpdate);
  return () => socket.off('dashboard-update', onUpdate);
}, [refetchDashboard]);
```
