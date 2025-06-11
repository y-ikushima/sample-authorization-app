// router.go
package main

import (
	"net/http"
	"system-service/db/sqlc"

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

	r.GET("/system/all", func(c *gin.Context) {
		systems, err := queries.GetSystems(c)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, systems)
	})

	r.GET("/system/:id", func(c *gin.Context) {
		system, err := queries.GetSystem(c, c.Param("id"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, system)
	})	

	r.GET("/system/account/:id", func(c *gin.Context) {
		accounts, err := queries.GetSystemAccounts(c, c.Param("id"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, accounts)
	})			
	
	return r
}