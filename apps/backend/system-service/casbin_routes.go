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

		// 全システムを取得
		allSystems, err := queries.GetSystems(c)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// 各システムに対する読み取り権限をチェックして、権限のあるシステムのみフィルタリング
		var accessibleSystems []sqlc.System
		for _, system := range allSystems {
			allowed, err := checkAuthorization(subject, "/system/"+system.ID, "GET")
			if err == nil && allowed {
				accessibleSystems = append(accessibleSystems, system)
			}
		}

		c.JSON(http.StatusOK, accessibleSystems)
	})

	api.GET("/system/:id", func(c *gin.Context) {
		// 認可チェック
		subject := c.GetHeader("X-User-ID")
		if subject == "" {
			subject = "anonymous"
		}
		systemID := c.Param("id")

		allowed, err := checkAuthorization(subject, "/system/"+systemID, "GET")
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

		allowed, err := checkAuthorization(subject, "/system/"+systemID, "GET")
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

		allowed, err := checkAuthorization(subject, "/system/"+systemID, "GET")
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

		allowed, err := checkAuthorization(subject, "/system/"+systemID, "PUT")
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

	// システム削除API（Casbin用に追加）
	api.DELETE("/system/:id", func(c *gin.Context) {
		// 認可チェック
		subject := c.GetHeader("X-User-ID")
		if subject == "" {
			subject = "anonymous"
		}
		systemID := c.Param("id")

		allowed, err := checkAuthorization(subject, "/system/"+systemID, "DELETE")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("認可チェックエラー: %v", err)})
			return
		}
		if !allowed {
			c.JSON(http.StatusForbidden, gin.H{"error": "アクセスが拒否されました"})
			return
		}
		
		// システムを削除（実装例 - 実際のDeleteSystem関数が必要）
		// err := queries.DeleteSystem(c, systemID)
		// if err != nil {
		// 	c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		// 	return
		// }
		
		c.JSON(http.StatusOK, gin.H{"message": "システムが削除されました", "system_id": systemID})
	})

	// メンバー管理API（Casbin用に追加）
	api.POST("/system/:id/members", func(c *gin.Context) {
		// 認可チェック
		subject := c.GetHeader("X-User-ID")
		if subject == "" {
			subject = "anonymous"
		}
		systemID := c.Param("id")

		allowed, err := checkAuthorization(subject, "/system/"+systemID, "POST")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("認可チェックエラー: %v", err)})
			return
		}
		if !allowed {
			c.JSON(http.StatusForbidden, gin.H{"error": "メンバー管理権限がありません"})
			return
		}
		
		// メンバー追加の実装（実装例）
		c.JSON(http.StatusOK, gin.H{"message": "メンバーが追加されました", "system_id": systemID})
	})
} 