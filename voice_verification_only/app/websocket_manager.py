"""
WebSocket Session Manager — app/websocket_manager.py
======================================================
Manages active verification sessions keyed by session_id.
Each session owns one VerifierSession (stateful per-connection verifier).
"""

import asyncio
import json
from typing import Dict, Optional
from fastapi import WebSocket


class ConnectionManager:
    """Tracks active WebSocket connections."""

    def __init__(self):
        # session_id -> WebSocket
        self._connections: Dict[str, WebSocket] = {}

    def register(self, session_id: str, ws: WebSocket):
        self._connections[session_id] = ws

    def unregister(self, session_id: str):
        self._connections.pop(session_id, None)

    async def send_json(self, session_id: str, payload: dict):
        ws = self._connections.get(session_id)
        if ws:
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                pass

    def is_connected(self, session_id: str) -> bool:
        return session_id in self._connections


# Single global instance imported by routes
manager = ConnectionManager()
