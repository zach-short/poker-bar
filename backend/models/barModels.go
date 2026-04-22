package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Player struct {
	ID        primitive.ObjectID `bson:"_id" json:"id"`
	Name      string             `bson:"name" json:"name"`
	Phone     string             `bson:"phone,omitempty" json:"phone,omitempty"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}

type InventoryItem struct {
	ID               primitive.ObjectID `bson:"_id" json:"id"`
	Name             string             `bson:"name" json:"name"`
	Category         string             `bson:"category" json:"category"` // Spirit, Mixer, Garnish, Syrup, Equipment
	Unit             string             `bson:"unit" json:"unit"`
	QtyOnHand        float64            `bson:"qtyOnHand" json:"qtyOnHand"`
	ReorderThreshold float64            `bson:"reorderThreshold" json:"reorderThreshold"`
	CostPerUnit      float64            `bson:"costPerUnit" json:"costPerUnit"`
}

type Ingredient struct {
	ItemID  primitive.ObjectID `bson:"itemId" json:"itemId"`
	QtyUsed float64            `bson:"qtyUsed" json:"qtyUsed"`
}

type DrinkRecipe struct {
	ID           primitive.ObjectID `bson:"_id" json:"id"`
	Name         string             `bson:"name" json:"name"`
	Price        float64            `bson:"price" json:"price"`
	CostEstimate float64            `bson:"costEstimate" json:"costEstimate"`
	Ingredients  []Ingredient       `bson:"ingredients" json:"ingredients"`
}

type Session struct {
	ID        primitive.ObjectID   `bson:"_id" json:"id"`
	Name      string               `bson:"name" json:"name"`
	Date      time.Time            `bson:"date" json:"date"`
	Status    string               `bson:"status" json:"status"` // active, closed
	PlayerIDs []primitive.ObjectID `bson:"playerIds" json:"playerIds"`
}

type BuyIn struct {
	ID        primitive.ObjectID `bson:"_id" json:"id"`
	SessionID primitive.ObjectID `bson:"sessionId" json:"sessionId"`
	PlayerID  primitive.ObjectID `bson:"playerId" json:"playerId"`
	Amount    float64            `bson:"amount" json:"amount"`
	Timestamp time.Time          `bson:"timestamp" json:"timestamp"`
}

type Cashout struct {
	ID        primitive.ObjectID `bson:"_id" json:"id"`
	SessionID primitive.ObjectID `bson:"sessionId" json:"sessionId"`
	PlayerID  primitive.ObjectID `bson:"playerId" json:"playerId"`
	Amount    float64            `bson:"amount" json:"amount"`
	Timestamp time.Time          `bson:"timestamp" json:"timestamp"`
}

type Payment struct {
	ID        primitive.ObjectID `bson:"_id" json:"id"`
	PlayerID  primitive.ObjectID `bson:"playerId" json:"playerId"`
	Amount    float64            `bson:"amount" json:"amount"`
	Note      string             `bson:"note" json:"note"`
	Direction string             `bson:"direction" json:"direction"` // "received" | "sent"
	Timestamp time.Time          `bson:"timestamp" json:"timestamp"`
}

type Order struct {
	ID           primitive.ObjectID `bson:"_id" json:"id"`
	SessionID    primitive.ObjectID `bson:"sessionId" json:"sessionId"`
	PlayerID     primitive.ObjectID `bson:"playerId" json:"playerId"`
	DrinkID      primitive.ObjectID `bson:"drinkId" json:"drinkId"`
	DrinkName    string             `bson:"drinkName" json:"drinkName"`
	Price        float64            `bson:"price" json:"price"`
	CostEstimate float64            `bson:"costEstimate" json:"costEstimate"`
	Timestamp    time.Time          `bson:"timestamp" json:"timestamp"`
	Paid         bool               `bson:"paid" json:"paid"`
}
