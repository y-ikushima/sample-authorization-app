// router.go
package main

import (
	"fmt"
	"net/http"
	"system-service/db/sqlc"

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
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With", "X-User-ID"}
	config.AllowCredentials = true
	r.Use(cors.New(config))

	// ヘルスチェック用の簡単なエンドポイントを定義
	r.GET("/health", func(c *gin.Context) {
		// 単純なレスポンスとしてステータス200を返す
		c.JSON(http.StatusOK, gin.H{
			"status": "UP",
		})
	})
	setupCasbinRoutes(r.Group("/api/casbin"), queries)
	setupOPARoutes(r.Group("/api/opa"), queries)
	setupSpiceDBRoutes(r.Group("/api/spicedb"), queries)

	return r
}


func  setupRoutes(api *gin.RouterGroup,queries *sqlc.Queries) {

	api.GET("/system/all", func(c *gin.Context) {
		systems, err := queries.GetSystems(c)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, systems)
	})

	api.GET("/system/:id", func(c *gin.Context) {
		system, err := queries.GetSystem(c, c.Param("id"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, system)
	})	

	api.GET("/system/account/:id", func(c *gin.Context) {
		accounts, err := queries.GetSystemAccounts(c, c.Param("id"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, accounts)
	})

	// 🎯 システムに所属するユーザの名称一覧を取得するAPI
	api.GET("/system/:id/users", func(c *gin.Context) {
		systemID := c.Param("id")
		
		// 1. システムに関連するユーザーIDを取得
		relations, err := queries.GetSystemAccounts(c, systemID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		
		// 2. UserIDsを抽出（nullチェック付き）
		var userIDs []string
		for _, rel := range relations {
			if rel.UserID.Valid {
				userIDs = append(userIDs, rel.UserID.String)
			}
		}
		
		if len(userIDs) == 0 {
			c.JSON(http.StatusOK, []SystemUserInfo{})
			return
		}
		
		// 3. User Serviceから一括でユーザー情報を取得
		users, err := fetchUsersFromUserService(userIDs)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to fetch users: %v", err)})
			return
		}
		
		// 4. レスポンス用のデータを構成
		var result []SystemUserInfo
		userMap := make(map[string]UserInfo)
		for _, user := range users {
			userMap[user.ID] = user
		}
		
		for _, rel := range relations {
			if rel.UserID.Valid {
				if user, exists := userMap[rel.UserID.String]; exists {
					result = append(result, SystemUserInfo{
						UserID:    user.ID,
						UserName:  user.Name,
						UserEmail: user.Email,
						SystemID:  systemID,
					})
				}
			}
		}
		
		c.JSON(http.StatusOK, result)
	})

	// システム更新API
	api.PUT("/system/:id", func(c *gin.Context) {
		systemID := c.Param("id")
		
		var req UpdateSystemRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		
		// システムを更新
		updatedSystem, err := queries.UpdateSystem(c, sqlc.UpdateSystemParams{
			ID:   systemID,
			Name: req.Name,
			Note: req.Note,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		
		c.JSON(http.StatusOK, updatedSystem)
	})
}