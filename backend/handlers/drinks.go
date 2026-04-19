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

func GetDrinks(c *gin.Context) {
	collection := config.GetCollection("drinks")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "name", Value: 1}})
	cursor, err := collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch drinks"})
		return
	}
	defer cursor.Close(ctx)

	var drinks []models.DrinkRecipe
	if err := cursor.All(ctx, &drinks); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode drinks"})
		return
	}
	if drinks == nil {
		drinks = []models.DrinkRecipe{}
	}

	c.JSON(http.StatusOK, drinks)
}

type IngredientRequest struct {
	ItemID  string  `json:"itemId" binding:"required"`
	QtyUsed float64 `json:"qtyUsed" binding:"required"`
}

func CreateDrink(c *gin.Context) {
	var req struct {
		Name         string              `json:"name" binding:"required"`
		Price        float64             `json:"price" binding:"required"`
		CostEstimate float64             `json:"costEstimate"`
		Ingredients  []IngredientRequest `json:"ingredients"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ingredients := make([]models.Ingredient, 0, len(req.Ingredients))
	for _, ing := range req.Ingredients {
		id, err := primitive.ObjectIDFromHex(ing.ItemID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ingredient itemId: " + ing.ItemID})
			return
		}
		ingredients = append(ingredients, models.Ingredient{ItemID: id, QtyUsed: ing.QtyUsed})
	}

	drink := models.DrinkRecipe{
		ID:           primitive.NewObjectID(),
		Name:         req.Name,
		Price:        req.Price,
		CostEstimate: req.CostEstimate,
		Ingredients:  ingredients,
	}

	collection := config.GetCollection("drinks")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if _, err := collection.InsertOne(ctx, drink); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create drink"})
		return
	}

	c.JSON(http.StatusCreated, drink)
}

func UpdateDrink(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var req struct {
		Name         *string             `json:"name"`
		Price        *float64            `json:"price"`
		CostEstimate *float64            `json:"costEstimate"`
		Ingredients  []IngredientRequest `json:"ingredients"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	update := bson.M{}
	if req.Name != nil {
		update["name"] = *req.Name
	}
	if req.Price != nil {
		update["price"] = *req.Price
	}
	if req.CostEstimate != nil {
		update["costEstimate"] = *req.CostEstimate
	}
	if req.Ingredients != nil {
		ingredients := make([]models.Ingredient, 0, len(req.Ingredients))
		for _, ing := range req.Ingredients {
			itemID, err := primitive.ObjectIDFromHex(ing.ItemID)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ingredient itemId"})
				return
			}
			ingredients = append(ingredients, models.Ingredient{ItemID: itemID, QtyUsed: ing.QtyUsed})
		}
		update["ingredients"] = ingredients
	}

	collection := config.GetCollection("drinks")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var updated models.DrinkRecipe
	if err := collection.FindOneAndUpdate(ctx, bson.M{"_id": id}, bson.M{"$set": update}, opts).Decode(&updated); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Drink not found"})
		return
	}

	c.JSON(http.StatusOK, updated)
}
