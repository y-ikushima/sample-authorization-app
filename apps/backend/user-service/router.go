// router.go
package main

import (
	"net/http"
	"user-service/db/sqlc"

	"github.com/gin-gonic/gin"
)
func setupRouter(queries *sqlc.Queries) *gin.Engine {
	// Ginを設定
	r := gin.Default()

	// ヘルスチェック用の簡単なエンドポイントを定義
	r.GET("/health", func(c *gin.Context) {
		// 単純なレスポンスとしてステータス200を返す
		c.JSON(http.StatusOK, gin.H{
			"status": "UP",
		})
	})


	r.GET("/user/all", func(c *gin.Context) {
		users, err := queries.GetUsers(c)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, users)
	})


	r.GET("/user/:id", func(c *gin.Context) {
		user, err := queries.GetUser(c, c.Param("id"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, user)
	})	

	// 複数ユーザーIDで一括取得するAPI
	r.POST("/users/batch", func(c *gin.Context) {
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

	return r
}