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

func GetInventory(c *gin.Context) {
	collection := config.GetCollection("inventory")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "category", Value: 1}, {Key: "name", Value: 1}})
	cursor, err := collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch inventory"})
		return
	}
	defer cursor.Close(ctx)

	var items []models.InventoryItem
	if err := cursor.All(ctx, &items); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode inventory"})
		return
	}
	if items == nil {
		items = []models.InventoryItem{}
	}

	c.JSON(http.StatusOK, items)
}

func CreateInventoryItem(c *gin.Context) {
	var req struct {
		Name             string  `json:"name" binding:"required"`
		Category         string  `json:"category" binding:"required"`
		Unit             string  `json:"unit" binding:"required"`
		QtyOnHand        float64 `json:"qtyOnHand"`
		ReorderThreshold float64 `json:"reorderThreshold"`
		CostPerUnit      float64 `json:"costPerUnit"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	item := models.InventoryItem{
		ID:               primitive.NewObjectID(),
		Name:             req.Name,
		Category:         req.Category,
		Unit:             req.Unit,
		QtyOnHand:        req.QtyOnHand,
		ReorderThreshold: req.ReorderThreshold,
		CostPerUnit:      req.CostPerUnit,
	}

	collection := config.GetCollection("inventory")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if _, err := collection.InsertOne(ctx, item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create inventory item"})
		return
	}

	c.JSON(http.StatusCreated, item)
}

func UpdateInventoryItem(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var req struct {
		Name             *string  `json:"name"`
		Category         *string  `json:"category"`
		Unit             *string  `json:"unit"`
		QtyOnHand        *float64 `json:"qtyOnHand"`
		ReorderThreshold *float64 `json:"reorderThreshold"`
		CostPerUnit      *float64 `json:"costPerUnit"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	update := bson.M{}
	if req.Name != nil {
		update["name"] = *req.Name
	}
	if req.Category != nil {
		update["category"] = *req.Category
	}
	if req.Unit != nil {
		update["unit"] = *req.Unit
	}
	if req.QtyOnHand != nil {
		update["qtyOnHand"] = *req.QtyOnHand
	}
	if req.ReorderThreshold != nil {
		update["reorderThreshold"] = *req.ReorderThreshold
	}
	if req.CostPerUnit != nil {
		update["costPerUnit"] = *req.CostPerUnit
	}

	collection := config.GetCollection("inventory")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var updated models.InventoryItem
	err = collection.FindOneAndUpdate(ctx, bson.M{"_id": id}, bson.M{"$set": update}, opts).Decode(&updated)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
		return
	}

	c.JSON(http.StatusOK, updated)
}
