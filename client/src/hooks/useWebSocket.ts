import { useEffect, useRef } from "react";
import { queryClient } from "@/lib/queryClient";
import { nanoid } from "nanoid";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  useEffect(() => {
    let isConnecting = false;
    let isMounted = true;
    let pingIntervalId: NodeJS.Timeout | null = null;

    const connect = () => {
      // Prevent multiple simultaneous connection attempts
      if (!isMounted || isConnecting || (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }

      // Close existing connection if any
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        return;
      }

      isConnecting = true;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const token = nanoid();
      const wsUrl = `${protocol}//${host}/ws?token=${token}`;
      
      console.log("WS: Connecting to:", wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WS: Connected successfully");
        isConnecting = false;
        reconnectAttemptsRef.current = 0;

        // Start ping interval when connection opens
        if (pingIntervalId) {
          clearInterval(pingIntervalId);
        }
        pingIntervalId = setInterval(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            try {
              wsRef.current.send(JSON.stringify({ type: 'ping' }));
            } catch (error) {
              console.error("WS: Ping error:", error);
            }
          }
        }, 20000); // Ping every 20 seconds to keep connection alive
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'pong') {
            return;
          }

          const { event: eventType, data } = message;

          if (!eventType) {
            return;
          }

          console.log("WS:", eventType);

          // Force immediate refetch for all related queries
          if (eventType.startsWith("job:")) {
            console.log("WS: Refetching jobs");
            queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
            queryClient.refetchQueries({ queryKey: ["/api/jobs"], type: 'active' });
          } else if (eventType.startsWith("task:")) {
            console.log("WS: Refetching tasks");
            queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
            queryClient.refetchQueries({ queryKey: ["/api/tasks"], type: 'active' });
          } else if (eventType.startsWith("note:")) {
            console.log("WS: Refetching notes");
            queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
            queryClient.refetchQueries({ queryKey: ["/api/notes"], type: 'active' });
          } else if (eventType.startsWith("user:")) {
            console.log("WS: Refetching user profile");
            queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
            queryClient.refetchQueries({ queryKey: ["/api/auth/me"], type: 'active' });
          }
        } catch (error) {
          console.error("WS message error:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("WS: Error occurred");
        isConnecting = false;
      };

      ws.onclose = (event) => {
        console.log("WS: Disconnected (code:", event.code + ")");
        isConnecting = false;
        wsRef.current = null;

        // Clear ping interval on close
        if (pingIntervalId) {
          clearInterval(pingIntervalId);
          pingIntervalId = null;
        }

        // Reconnect with exponential backoff only if component is still mounted
        if (isMounted && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`WS: Reconnecting in ${delay}ms (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          reconnectAttemptsRef.current++;
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else if (!isMounted) {
          console.log("WS: Stopped (unmounted)");
        } else {
          console.log("WS: Max attempts reached");
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (pingIntervalId) {
        clearInterval(pingIntervalId);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);
}
