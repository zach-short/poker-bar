package handlers

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/zach-short/nextjs-boilerplate/config"
	"github.com/zach-short/nextjs-boilerplate/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func GetOrders(c *gin.Context) {
	collection := config.GetCollection("orders")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{}
	if sid := c.Query("sessionId"); sid != "" {
		id, err := primitive.ObjectIDFromHex(sid)
		if err == nil {
			filter["sessionId"] = id
		}
	}
	if pid := c.Query("playerId"); pid != "" {
		id, err := primitive.ObjectIDFromHex(pid)
		if err == nil {
			filter["playerId"] = id
		}
	}

	opts := options.Find().SetSort(bson.D{{Key: "timestamp", Value: -1}})
	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch orders"})
		return
	}
	defer cursor.Close(ctx)

	var orders []models.Order
	if err := cursor.All(ctx, &orders); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode orders"})
		return
	}
	if orders == nil {
		orders = []models.Order{}
	}

	c.JSON(http.StatusOK, orders)
}

func CreateOrder(c *gin.Context) {
	var req struct {
		SessionID string `json:"sessionId" binding:"required"`
		PlayerID  string `json:"playerId" binding:"required"`
		DrinkID   string `json:"drinkId" binding:"required"`
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
	drinkID, err := primitive.ObjectIDFromHex(req.DrinkID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid drinkId"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// Fetch the drink recipe
	var drink models.DrinkRecipe
	if err := config.GetCollection("drinks").FindOne(ctx, bson.M{"_id": drinkID}).Decode(&drink); err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Drink not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch drink"})
		}
		return
	}

	invCollection := config.GetCollection("inventory")

	// Check all ingredients have sufficient qty
	for _, ing := range drink.Ingredients {
		var item models.InventoryItem
		if err := invCollection.FindOne(ctx, bson.M{"_id": ing.ItemID}).Decode(&item); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check ingredient: " + ing.ItemID.Hex()})
			return
		}
		if item.QtyOnHand < ing.QtyUsed {
			c.JSON(http.StatusUnprocessableEntity, gin.H{
				"error":     fmt.Sprintf("Insufficient stock for %s (have %.2f %s, need %.2f)", item.Name, item.QtyOnHand, item.Unit, ing.QtyUsed),
				"itemName":  item.Name,
				"have":      item.QtyOnHand,
				"need":      ing.QtyUsed,
				"unit":      item.Unit,
			})
			return
		}
	}

	// Deduct inventory
	lowStockWarnings := []string{}
	for _, ing := range drink.Ingredients {
		singleResult := invCollection.FindOneAndUpdate(
			ctx,
			bson.M{"_id": ing.ItemID},
			bson.M{"$inc": bson.M{"qtyOnHand": -ing.QtyUsed}},
			options.FindOneAndUpdate().SetReturnDocument(options.After),
		)
		if singleResult.Err() != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to deduct inventory"})
			return
		}
		var updatedItem models.InventoryItem
		if err := singleResult.Decode(&updatedItem); err == nil {
			if updatedItem.QtyOnHand <= updatedItem.ReorderThreshold {
				lowStockWarnings = append(lowStockWarnings, updatedItem.Name)
			}
		}
	}

	// Create the order
	order := models.Order{
		ID:           primitive.NewObjectID(),
		SessionID:    sessionID,
		PlayerID:     playerID,
		DrinkID:      drinkID,
		DrinkName:    drink.Name,
		Price:        drink.Price,
		CostEstimate: drink.CostEstimate,
		Timestamp:    time.Now(),
	}

	if _, err := config.GetCollection("orders").InsertOne(ctx, order); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"order":            order,
		"lowStockWarnings": lowStockWarnings,
	})
}

func DeleteOrder(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	var order models.Order
	if err := config.GetCollection("orders").FindOne(ctx, bson.M{"_id": id}).Decode(&order); err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch order"})
		}
		return
	}

	// Restore inventory
	var drink models.DrinkRecipe
	if err := config.GetCollection("drinks").FindOne(ctx, bson.M{"_id": order.DrinkID}).Decode(&drink); err == nil {
		invCollection := config.GetCollection("inventory")
		for _, ing := range drink.Ingredients {
			invCollection.FindOneAndUpdate(
				ctx,
				bson.M{"_id": ing.ItemID},
				bson.M{"$inc": bson.M{"qtyOnHand": ing.QtyUsed}},
			)
		}
	}

	if _, err := config.GetCollection("orders").DeleteOne(ctx, bson.M{"_id": id}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete order"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Order deleted"})
}
