package main

import (
	"fmt"
	"net/http"
	"system-service/db/sqlc"

	"github.com/gin-gonic/gin"
)

// Casbin認可チェック付きのルート設定
func setupCasbinRoutes(api *gin.RouterGroup, queries *sqlc.Queries) {

	api.GET("/system/all", func(c *gin.Context) {
		// 認可チェック - subjectはリクエストヘッダーから取得（仮でuser_idを使用）
		subject := c.GetHeader("X-User-ID")
		if subject == "" {
			subject = "anonymous" // デフォルト値
		}

		// 認可チェック
		allowed, err := checkAuthorization(subject, "/system/**", "GET")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("認可チェックエラー: %v", err)})
			return
		}
		if !allowed {
			c.JSON(http.StatusForbidden, gin.H{"error": "アクセスが拒否されました"})
			return
		}

		systems, err := queries.GetSystems(c)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, systems)
	})

	api.GET("/system/:id", func(c *gin.Context) {
		// 認可チェック
		subject := c.GetHeader("X-User-ID")
		if subject == "" {
			subject = "anonymous"
		}
		systemID := c.Param("id")

		allowed, err := checkAuthorization(subject, "/system/"+systemID+"*", "GET")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("認可チェックエラー: %v", err)})
			return
		}
		if !allowed {
			c.JSON(http.StatusForbidden, gin.H{"error": "アクセスが拒否されました"})
			return
		}

		system, err := queries.GetSystem(c, systemID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, system)
	})	

	api.GET("/system/account/:id", func(c *gin.Context) {
		// 認可チェック
		subject := c.GetHeader("X-User-ID")
		if subject == "" {
			subject = "anonymous"
		}
		systemID := c.Param("id")

		allowed, err := checkAuthorization(subject, "/system/"+systemID+"*", "GET")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("認可チェックエラー: %v", err)})
			return
		}
		if !allowed {
			c.JSON(http.StatusForbidden, gin.H{"error": "アクセスが拒否されました"})
			return
		}

		accounts, err := queries.GetSystemAccounts(c, systemID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, accounts)
	})

	// 🎯 システムに所属するユーザの名称一覧を取得するAPI
	api.GET("/system/:id/users", func(c *gin.Context) {
		// 認可チェック
		subject := c.GetHeader("X-User-ID")
		if subject == "" {
			subject = "anonymous"
		}
		systemID := c.Param("id")

		allowed, err := checkAuthorization(subject, "/system/"+systemID+"*", "GET")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("認可チェックエラー: %v", err)})
			return
		}
		if !allowed {
			c.JSON(http.StatusForbidden, gin.H{"error": "アクセスが拒否されました"})
			return
		}
		
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
		// 認可チェック
		subject := c.GetHeader("X-User-ID")
		if subject == "" {
			subject = "anonymous"
		}
		systemID := c.Param("id")

		allowed, err := checkAuthorization(subject, "/system/"+systemID+"*", "PUT")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("認可チェックエラー: %v", err)})
			return
		}
		if !allowed {
			c.JSON(http.StatusForbidden, gin.H{"error": "アクセスが拒否されました"})
			return
		}
		
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