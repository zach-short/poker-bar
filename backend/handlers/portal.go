package handlers

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/zach-short/nextjs-boilerplate/config"
	"github.com/zach-short/nextjs-boilerplate/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func portalToken(playerID string) string {
	secret := os.Getenv("PORTAL_SECRET")
	if secret == "" {
		secret = "dev-portal-secret"
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(playerID))
	return hex.EncodeToString(mac.Sum(nil))
}

// GET /api/players/:id/portal-token — admin, returns signed token
func GetPortalToken(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"token": portalToken(c.Param("id"))})
}

// GET /api/portal/:playerId/validate?token=xxx — public, validates token + returns player
func ValidatePortalToken(c *gin.Context) {
	playerID := c.Param("playerId")
	token := c.Query("token")

	if !hmac.Equal([]byte(token), []byte(portalToken(playerID))) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return
	}

	objID, err := primitive.ObjectIDFromHex(playerID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid player ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var player models.Player
	if err := config.GetCollection("players").FindOne(ctx, bson.M{"_id": objID}).Decode(&player); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Player not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"valid": true, "player": player})
}
