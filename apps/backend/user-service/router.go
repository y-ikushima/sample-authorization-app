// router.go
package main

import (
	"net/http"
	"user-service/db/sqlc"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)
func setupRouter(queries *sqlc.Queries) *gin.Engine {
	// Ginを設定
	r := gin.Default()

	// CORS設定を追加
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{
		"http://localhost:3000", // Next.js development server
		"http://localhost:3001", 
		"http://localhost:3002",
	}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"}
	config.AllowCredentials = true
	r.Use(cors.New(config))

	// ヘルスチェック用の簡単なエンドポイントを定義
	r.GET("/health", func(c *gin.Context) {
		// 単純なレスポンスとしてステータス200を返す
		c.JSON(http.StatusOK, gin.H{
			"status": "UP",
		})
	})

	// APIルートグループを作成
	api := r.Group("/api")
	{
		api.GET("/user/all", func(c *gin.Context) {
			users, err := queries.GetUsers(c)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, users)
		})

		api.GET("/user/:id", func(c *gin.Context) {
			user, err := queries.GetUser(c, c.Param("id"))
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, user)
		})	

		// 複数ユーザーIDで一括取得するAPI
		api.POST("/users/batch", func(c *gin.Context) {
			var request struct {
				UserIDs []string `json:"user_ids"`
			}
			
			if err := c.ShouldBindJSON(&request); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			
			users, err := queries.GetUsersByIDs(c, request.UserIDs)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, users)
		})
	}

	return r
}