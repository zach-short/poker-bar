package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/zach-short/nextjs-boilerplate/handlers"
	"github.com/zach-short/nextjs-boilerplate/middleware"
)

func SetupRoutes(r *gin.Engine) {
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Auth routes (public)
	auth := r.Group("/auth")
	{
		auth.POST("/login", handlers.Login)
		auth.POST("/register", handlers.Register)
		auth.POST("/social", handlers.SocialAuth)
		auth.POST("/check-email", handlers.CheckEmail)
	}

	// Bar routes (no auth — single-user app)
	bar := r.Group("/api")
	{
		bar.GET("/players", handlers.GetPlayers)
		bar.POST("/players", handlers.CreatePlayer)

		bar.GET("/inventory", handlers.GetInventory)
		bar.POST("/inventory", handlers.CreateInventoryItem)
		bar.PATCH("/inventory/:id", handlers.UpdateInventoryItem)

		bar.GET("/drinks", handlers.GetDrinks)
		bar.POST("/drinks", handlers.CreateDrink)
		bar.PUT("/drinks/:id", handlers.UpdateDrink)

		bar.GET("/sessions", handlers.GetSessions)
		bar.POST("/sessions", handlers.CreateSession)
		bar.PATCH("/sessions/:id", handlers.UpdateSession)

		bar.GET("/orders", handlers.GetOrders)
		bar.POST("/orders", handlers.CreateOrder)
		bar.DELETE("/orders/:id", handlers.DeleteOrder)
		bar.PATCH("/sessions/:id/players/:playerId/paid", handlers.MarkPlayerTabPaid)

		bar.GET("/buyins", handlers.GetBuyIns)
		bar.POST("/buyins", handlers.CreateBuyIn)
		bar.DELETE("/buyins/:id", handlers.DeleteBuyIn)

		bar.GET("/cashouts", handlers.GetCashouts)
		bar.POST("/cashouts", handlers.CreateCashout)

		bar.GET("/payments", handlers.GetPayments)
		bar.POST("/payments", handlers.CreatePayment)
	}

	_ = middleware.AuthMiddleware
}
