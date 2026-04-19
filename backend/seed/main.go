package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/zach-short/nextjs-boilerplate/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	if err := godotenv.Load("../.env"); err != nil {
		if err2 := godotenv.Load(".env"); err2 != nil {
			log.Println("No .env file found, using system env")
		}
	}

	uri := os.Getenv("DATABASE_URL")
	if uri == "" {
		log.Fatal("DATABASE_URL not set")
	}

	dbName := os.Getenv("DATABASE_NAME")
	if dbName == "" {
		dbName = "boilerplate"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri).SetServerAPIOptions(options.ServerAPI(options.ServerAPIVersion1)))
	if err != nil {
		log.Fatal("Connect:", err)
	}
	defer client.Disconnect(ctx)

	if err := client.Ping(ctx, nil); err != nil {
		log.Fatal("Ping:", err)
	}
	log.Println("Connected to MongoDB")

	db := client.Database(dbName)

	for _, coll := range []string{"inventory", "drinks"} {
		db.Collection(coll).DeleteMany(ctx, bson.M{})
	}

	type itemSeed struct {
		name     string
		category string
		unit     string
		qty      float64
		reorder  float64
		cost     float64
	}

	items := []itemSeed{
		// Spirits
		{"Vodka (Absolut)", "Spirit", "oz", 25, 5, 0.79},
		{"White Rum", "Spirit", "oz", 25, 5, 0.79},
		{"Dark Rum", "Spirit", "oz", 0, 5, 0.79},
		{"Tequila", "Spirit", "oz", 0, 5, 0.85},
		{"Bourbon", "Spirit", "oz", 0, 5, 0.90},
		{"Pimm's No.1", "Spirit", "oz", 25, 5, 0.95},
		{"Triple Sec", "Spirit", "oz", 25, 5, 0.70},
		{"Kahlúa", "Spirit", "oz", 25, 5, 0.90},
		// Mixers
		{"Club Soda", "Mixer", "oz", 0, 12, 0.06},
		{"Ginger Beer", "Mixer", "oz", 0, 12, 0.12},
		{"Cola", "Mixer", "oz", 64, 12, 0.06},
		{"Cranberry Juice", "Mixer", "oz", 64, 12, 0.10},
		{"Orange Juice", "Mixer", "oz", 64, 12, 0.08},
		{"Pineapple Juice", "Mixer", "oz", 64, 12, 0.10},
		{"Coconut Cream", "Mixer", "oz", 32, 8, 0.15},
		{"Lemonade", "Mixer", "oz", 64, 12, 0.08},
		{"Ginger Ale", "Mixer", "oz", 0, 12, 0.06},
		{"Margarita Mix", "Mixer", "oz", 64, 12, 0.10},
		{"Mudslide Mix", "Mixer", "oz", 64, 12, 0.12},
		{"Bloody Mary Mix", "Mixer", "oz", 64, 12, 0.10},
		{"Irish Cream", "Spirit", "oz", 0, 5, 0.85},
		// Syrups
		{"Simple Syrup", "Syrup", "oz", 0, 4, 0.10},
		{"Grenadine", "Syrup", "oz", 16, 4, 0.20},
		// Garnishes & bitters
		{"Angostura Bitters", "Garnish", "dash", 100, 20, 0.05},
		{"Limes", "Garnish", "each", 20, 5, 0.25},
		{"Lemons", "Garnish", "each", 15, 5, 0.25},
		{"Fresh Mint", "Garnish", "sprig", 40, 10, 0.10},
		{"Celery", "Garnish", "stalk", 10, 3, 0.20},
		{"Maraschino Cherries", "Garnish", "each", 30, 10, 0.10},
		{"Kosher Salt", "Garnish", "tsp", 50, 10, 0.01},
		{"Celery Salt", "Garnish", "tsp", 50, 10, 0.01},
		{"Tajín", "Garnish", "tsp", 50, 10, 0.02},
		{"Hot Sauce", "Garnish", "dash", 80, 20, 0.05},
		{"Worcestershire Sauce", "Garnish", "dash", 80, 20, 0.03},
		// Beer
		{"Beer", "Mixer", "each", 24, 6, 1.10},
	}

	invMap := map[string]primitive.ObjectID{}
	for _, s := range items {
		id := primitive.NewObjectID()
		invMap[s.name] = id
		item := models.InventoryItem{
			ID:               id,
			Name:             s.name,
			Category:         s.category,
			Unit:             s.unit,
			QtyOnHand:        s.qty,
			ReorderThreshold: s.reorder,
			CostPerUnit:      s.cost,
		}
		if _, err := db.Collection("inventory").InsertOne(ctx, item); err != nil {
			log.Fatal("Insert inventory:", err)
		}
	}
	log.Printf("Seeded %d inventory items", len(items))

	// ── Drinks ────────────────────────────────────────────────────────────────

	type ing struct {
		name string
		qty  float64
	}
	type drinkSeed struct {
		name  string
		price float64
		cost  float64
		ings  []ing
	}

	drinks := []drinkSeed{
		{
			name: "Mojito", price: 4, cost: 2.28,
			ings: []ing{{"White Rum", 2}, {"Simple Syrup", 0.75}, {"Club Soda", 2}, {"Fresh Mint", 5}, {"Limes", 0.5}},
		},
		{
			name: "Moscow Mule", price: 4, cost: 2.12,
			ings: []ing{{"Vodka (Absolut)", 2}, {"Ginger Beer", 4}, {"Limes", 0.25}},
		},
		{
			name: "Bloody Mary", price: 4, cost: 2.33,
			ings: []ing{{"Vodka (Absolut)", 2}, {"Bloody Mary Mix", 4}},
		},
		{
			name: "Pimm's Cup", price: 4, cost: 2.28,
			ings: []ing{{"Pimm's No.1", 2}, {"Lemonade", 4}, {"Limes", 0.25}},
		},
		{
			name: "Vodka Soda", price: 3, cost: 1.88,
			ings: []ing{{"Vodka (Absolut)", 2}, {"Club Soda", 4}, {"Limes", 0.25}},
		},
		{
			name: "Vodka Cran", price: 3, cost: 2.04,
			ings: []ing{{"Vodka (Absolut)", 2}, {"Cranberry Juice", 4}, {"Limes", 0.25}},
		},
		{
			name: "Tequila Sunrise", price: 4, cost: 2.12,
			ings: []ing{{"Tequila", 2}, {"Orange Juice", 4}, {"Grenadine", 0.5}},
		},
		{
			name: "Margarita", price: 5, cost: 2.35,
			ings: []ing{{"Tequila", 2}, {"Margarita Mix", 4}},
		},
		{
			name: "Whiskey Sour", price: 4, cost: 2.00,
			ings: []ing{{"Bourbon", 2}, {"Simple Syrup", 0.75}, {"Lemons", 0.5}},
		},
		{
			name: "Old Fashioned", price: 5, cost: 2.03,
			ings: []ing{{"Bourbon", 2}, {"Simple Syrup", 0.25}, {"Angostura Bitters", 2}, {"Maraschino Cherries", 1}},
		},
		{
			name: "Blended Mudslide", price: 5, cost: 2.84,
			ings: []ing{{"Vodka (Absolut)", 1.5}, {"Kahlúa", 1.5}, {"Irish Cream", 1.5}},
		},
		{
			name: "Piña Colada", price: 5, cost: 2.18,
			ings: []ing{{"White Rum", 2}, {"Pineapple Juice", 3}, {"Coconut Cream", 2}},
		},
		{
			name: "Rum & Coke", price: 3, cost: 1.82,
			ings: []ing{{"Dark Rum", 2}, {"Cola", 4}},
		},
		{
			name: "Screwdriver", price: 3, cost: 1.90,
			ings: []ing{{"Vodka (Absolut)", 2}, {"Orange Juice", 4}},
		},
		{
			name: "Beer", price: 1.5, cost: 1.10,
			ings: []ing{{"Beer", 1}},
		},
	}

	for _, d := range drinks {
		ingredients := make([]models.Ingredient, 0, len(d.ings))
		for _, i := range d.ings {
			itemID, ok := invMap[i.name]
			if !ok {
				log.Fatalf("Unknown ingredient %q for drink %q", i.name, d.name)
			}
			ingredients = append(ingredients, models.Ingredient{ItemID: itemID, QtyUsed: i.qty})
		}
		drink := models.DrinkRecipe{
			ID:           primitive.NewObjectID(),
			Name:         d.name,
			Price:        d.price,
			CostEstimate: d.cost,
			Ingredients:  ingredients,
		}
		if _, err := db.Collection("drinks").InsertOne(ctx, drink); err != nil {
			log.Fatal("Insert drink:", err)
		}
	}
	log.Printf("Seeded %d drinks", len(drinks))
	fmt.Println("Seed complete.")
}
