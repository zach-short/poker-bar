package utils

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/zach-short/nextjs-boilerplate/config"
	"go.mongodb.org/mongo-driver/bson"
)

func usernameExists(username string) bool {
	collection := config.DB.Database(os.Getenv("DATABASE_NAME")).Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	count, err := collection.CountDocuments(ctx, bson.M{"name": username})
	if err != nil {
		return true
	}

	return count > 0
}

func GenerateUsernameFromEmail(email string) (string, error) {
	parts := strings.Split(email, "@")
	if len(parts) == 0 {
		return "", fmt.Errorf("invalid email")
	}

	baseUsername := parts[0]
	cleanBase := strings.ToLower(strings.ReplaceAll(baseUsername, ".", "_"))

	if !usernameExists(cleanBase) {
		return cleanBase, nil
	}

	for i := 1; i <= 999; i++ {
		username := fmt.Sprintf("%s_%d", cleanBase, i)
		if !usernameExists(username) {
			return username, nil
		}
	}

	return fmt.Sprintf("%s_%d", cleanBase, time.Now().Unix()), nil
}
