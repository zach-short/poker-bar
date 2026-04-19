package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/zach-short/nextjs-boilerplate/config"
	"github.com/zach-short/nextjs-boilerplate/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ── Buy-ins ──────────────────────────────────────────────────────────────────

func GetBuyIns(c *gin.Context) {
	filter := bson.M{}
	if v := c.Query("sessionId"); v != "" {
		if id, err := primitive.ObjectIDFromHex(v); err == nil {
			filter["sessionId"] = id
		}
	}
	if v := c.Query("playerId"); v != "" {
		if id, err := primitive.ObjectIDFromHex(v); err == nil {
			filter["playerId"] = id
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "timestamp", Value: 1}})
	cursor, err := config.GetCollection("buyins").Find(ctx, filter, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch buy-ins"})
		return
	}
	defer cursor.Close(ctx)

	var buyIns []models.BuyIn
	if err := cursor.All(ctx, &buyIns); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode buy-ins"})
		return
	}
	if buyIns == nil {
		buyIns = []models.BuyIn{}
	}
	c.JSON(http.StatusOK, buyIns)
}

func CreateBuyIn(c *gin.Context) {
	var req struct {
		SessionID string  `json:"sessionId" binding:"required"`
		PlayerID  string  `json:"playerId" binding:"required"`
		Amount    float64 `json:"amount" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	sessionID, err := primitive.ObjectIDFromHex(req.SessionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid sessionId"})
		return
	}
	playerID, err := primitive.ObjectIDFromHex(req.PlayerID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid playerId"})
		return
	}

	buyIn := models.BuyIn{
		ID:        primitive.NewObjectID(),
		SessionID: sessionID,
		PlayerID:  playerID,
		Amount:    req.Amount,
		Timestamp: time.Now(),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if _, err := config.GetCollection("buyins").InsertOne(ctx, buyIn); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create buy-in"})
		return
	}
	c.JSON(http.StatusCreated, buyIn)
}

func DeleteBuyIn(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if _, err := config.GetCollection("buyins").DeleteOne(ctx, bson.M{"_id": id}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete buy-in"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
}

// ── Cashouts ─────────────────────────────────────────────────────────────────

func GetCashouts(c *gin.Context) {
	filter := bson.M{}
	if v := c.Query("sessionId"); v != "" {
		if id, err := primitive.ObjectIDFromHex(v); err == nil {
			filter["sessionId"] = id
		}
	}
	if v := c.Query("playerId"); v != "" {
		if id, err := primitive.ObjectIDFromHex(v); err == nil {
			filter["playerId"] = id
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := config.GetCollection("cashouts").Find(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch cashouts"})
		return
	}
	defer cursor.Close(ctx)

	var cashouts []models.Cashout
	if err := cursor.All(ctx, &cashouts); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode cashouts"})
		return
	}
	if cashouts == nil {
		cashouts = []models.Cashout{}
	}
	c.JSON(http.StatusOK, cashouts)
}

func CreateCashout(c *gin.Context) {
	var req struct {
		SessionID string  `json:"sessionId" binding:"required"`
		PlayerID  string  `json:"playerId" binding:"required"`
		Amount    float64 `json:"amount"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	sessionID, err := primitive.ObjectIDFromHex(req.SessionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid sessionId"})
		return
	}
	playerID, err := primitive.ObjectIDFromHex(req.PlayerID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid playerId"})
		return
	}

	cashout := models.Cashout{
		ID:        primitive.NewObjectID(),
		SessionID: sessionID,
		PlayerID:  playerID,
		Amount:    req.Amount,
		Timestamp: time.Now(),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if _, err := config.GetCollection("cashouts").InsertOne(ctx, cashout); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create cashout"})
		return
	}
	c.JSON(http.StatusCreated, cashout)
}

// ── Payments ─────────────────────────────────────────────────────────────────

func GetPayments(c *gin.Context) {
	filter := bson.M{}
	if v := c.Query("playerId"); v != "" {
		if id, err := primitive.ObjectIDFromHex(v); err == nil {
			filter["playerId"] = id
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "timestamp", Value: -1}})
	cursor, err := config.GetCollection("payments").Find(ctx, filter, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch payments"})
		return
	}
	defer cursor.Close(ctx)

	var payments []models.Payment
	if err := cursor.All(ctx, &payments); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode payments"})
		return
	}
	if payments == nil {
		payments = []models.Payment{}
	}
	c.JSON(http.StatusOK, payments)
}

func CreatePayment(c *gin.Context) {
	var req struct {
		PlayerID  string  `json:"playerId" binding:"required"`
		Amount    float64 `json:"amount" binding:"required"`
		Note      string  `json:"note"`
		Direction string  `json:"direction" binding:"required"` // "received" | "sent"
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Direction != "received" && req.Direction != "sent" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "direction must be 'received' or 'sent'"})
		return
	}
	playerID, err := primitive.ObjectIDFromHex(req.PlayerID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid playerId"})
		return
	}

	payment := models.Payment{
		ID:        primitive.NewObjectID(),
		PlayerID:  playerID,
		Amount:    req.Amount,
		Note:      req.Note,
		Direction: req.Direction,
		Timestamp: time.Now(),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if _, err := config.GetCollection("payments").InsertOne(ctx, payment); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create payment"})
		return
	}
	c.JSON(http.StatusCreated, payment)
}
