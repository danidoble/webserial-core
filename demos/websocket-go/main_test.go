package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/websocket"
)

func TestWebSocketRequiresTokenAndAllowedOrigin(t *testing.T) {
	bridgeToken = "test-secret"
	allowedOrigins = "http://localhost:5173"
	server := httptest.NewServer(http.HandlerFunc(wsHandler))
	defer server.Close()
	base := "ws" + strings.TrimPrefix(server.URL, "http")

	for _, tc := range []struct {
		name, token, origin string
		allowed             bool
	}{
		{"missing token", "", "http://localhost:5173", false},
		{"wrong token", "wrong", "http://localhost:5173", false},
		{"wrong origin", bridgeToken, "https://attacker.example", false},
		{"valid credentials", bridgeToken, "http://localhost:5173", true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			url := base + "/?token=" + tc.token
			conn, response, err := websocket.DefaultDialer.Dial(url, http.Header{"Origin": []string{tc.origin}})
			if tc.allowed {
				if err != nil {
					t.Fatalf("expected connection: %v", err)
				}
				if err := conn.WriteJSON(InMessage{Type: "open", Path: "/not-an-enumerated-port", BaudRate: 9600}); err != nil {
					t.Fatal(err)
				}
				var reply OutMessage
				if err := conn.ReadJSON(&reply); err != nil {
					t.Fatal(err)
				}
				if reply.Type != "error" {
					t.Fatalf("expected denied port, got %s", reply.Type)
				}
				conn.Close()
				return
			}
			if err == nil {
				conn.Close()
				t.Fatal("connection should have been rejected")
			}
			if response == nil || response.StatusCode != http.StatusForbidden {
				t.Fatalf("expected 403, got %#v", response)
			}
		})
	}
}
