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

func GetSessions(c *gin.Context) {
	collection := config.GetCollection("sessions")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "date", Value: -1}})
	cursor, err := collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sessions"})
		return
	}
	defer cursor.Close(ctx)

	var sessions []models.Session
	if err := cursor.All(ctx, &sessions); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode sessions"})
		return
	}
	if sessions == nil {
		sessions = []models.Session{}
	}

	c.JSON(http.StatusOK, sessions)
}

func CreateSession(c *gin.Context) {
	var req struct {
		Name      string   `json:"name" binding:"required"`
		PlayerIDs []string `json:"playerIds"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	playerIDs := make([]primitive.ObjectID, 0, len(req.PlayerIDs))
	for _, pid := range req.PlayerIDs {
		id, err := primitive.ObjectIDFromHex(pid)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid playerId: " + pid})
			return
		}
		playerIDs = append(playerIDs, id)
	}

	session := models.Session{
		ID:        primitive.NewObjectID(),
		Name:      req.Name,
		Date:      time.Now(),
		Status:    "active",
		PlayerIDs: playerIDs,
	}

	collection := config.GetCollection("sessions")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if _, err := collection.InsertOne(ctx, session); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session"})
		return
	}

	c.JSON(http.StatusCreated, session)
}

func UpdateSession(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var req struct {
		Status    *string  `json:"status"`
		PlayerIDs []string `json:"playerIds"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	update := bson.M{}
	if req.Status != nil {
		update["status"] = *req.Status
	}
	if req.PlayerIDs != nil {
		playerIDs := make([]primitive.ObjectID, 0, len(req.PlayerIDs))
		for _, pid := range req.PlayerIDs {
			oid, err := primitive.ObjectIDFromHex(pid)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid playerId: " + pid})
				return
			}
			playerIDs = append(playerIDs, oid)
		}
		update["playerIds"] = playerIDs
	}

	collection := config.GetCollection("sessions")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var updated models.Session
	if err := collection.FindOneAndUpdate(ctx, bson.M{"_id": id}, bson.M{"$set": update}, opts).Decode(&updated); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	c.JSON(http.StatusOK, updated)
}
