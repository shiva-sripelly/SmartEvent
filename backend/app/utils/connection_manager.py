from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, event_id: int, websocket: WebSocket):
        await websocket.accept()
        if event_id not in self.active_connections:
            self.active_connections[event_id] = []
        self.active_connections[event_id].append(websocket)

    def disconnect(self, event_id: int, websocket: WebSocket):
        if event_id in self.active_connections:
            if websocket in self.active_connections[event_id]:
                self.active_connections[event_id].remove(websocket)
            if not self.active_connections[event_id]:
                del self.active_connections[event_id]

    async def broadcast_availability(
        self,
        event_id: int,
        available_tickets: int,
        status: str | None = None,
    ):
        if event_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[event_id]:
                try:
                    await connection.send_json(
                        {
                            "type": "availability_update",
                            "event_id": event_id,
                            "available_tickets": available_tickets,
                            "status": status,
                        }
                    )
                except (RuntimeError, WebSocketDisconnect):
                    disconnected.append(connection)

            for connection in disconnected:
                self.disconnect(event_id, connection)


manager = ConnectionManager()
