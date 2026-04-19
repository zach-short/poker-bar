package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	ID           primitive.ObjectID  `bson:"_id" json:"id"`
	Email        string              `bson:"email" json:"email"`
	Name         string              `bson:"name,omitempty" json:"name,omitempty"`
	PasswordHash string              `bson:"passwordHash,omitempty" json:"passwordHash,omitempty"`
	Picture      string              `bson:"picture,omitempty" json:"picture,omitempty"`
	Bio          string              `bson:"bio,omitempty" json:"bio,omitempty"`
	IsDeleted    bool                `bson:"isDeleted" json:"isDeleted"`
	DeletedAt    *primitive.DateTime `bson:"deletedAt,omitempty" json:"deletedAt,omitempty"`
}
