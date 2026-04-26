//go:build ignore

package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
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

	drinks := client.Database(dbName).Collection("drinks")

	res, err := drinks.UpdateMany(ctx,
		bson.M{"name": bson.M{"$ne": "Beer"}},
		bson.M{"$set": bson.M{"price": 2.0}},
	)
	if err != nil {
		log.Fatal("Update drinks:", err)
	}
	fmt.Printf("Updated %d drinks to $2.00\n", res.ModifiedCount)

	res, err = drinks.UpdateMany(ctx,
		bson.M{"name": "Beer"},
		bson.M{"$set": bson.M{"price": 1.0}},
	)
	if err != nil {
		log.Fatal("Update beer:", err)
	}
	fmt.Printf("Updated %d beer(s) to $1.00\n", res.ModifiedCount)
}
