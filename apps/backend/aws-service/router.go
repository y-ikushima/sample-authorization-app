// router.go
package main

import (
	"aws-service/db/sqlc"
	"net/http"

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


	r.GET("/account/all", func(c *gin.Context) {
		awsAccounts, err := queries.GetAwsAccounts(c)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, awsAccounts)
	})

	r.GET("/account/:id", func(c *gin.Context) {
		awsAccount, err := queries.GetAwsAccount(c, c.Param("id"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, awsAccount)
	})


	r.GET("/account/system/:systemId", func(c *gin.Context) {
		awsAccounts, err := queries.GetAwsAccountBySystemId(c, c.Param("systemId"))
			if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, awsAccounts)
	})



	return r
}