package main

import (
	"aws-service/db/sqlc"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

func setupCasbinRoutes(api *gin.RouterGroup, queries *sqlc.Queries) {
	// AWSアカウント一覧を取得するAPI
	api.GET("/account/all", func(c *gin.Context) {
		// 認可チェック
		subject := c.GetHeader("X-User-ID")
		if subject == "" {
			subject = "anonymous"
		}

		awsAccounts, err := queries.GetAwsAccounts(c)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// ユーザーがアクセス権限を持つAWSアカウントのみフィルタリング
		var allowedAccounts []sqlc.AwsAccount
		for _, account := range awsAccounts {
			// 読み取り権限をチェック（GETまたは*）
			allowed, err := checkCasbinAuthorization(subject, "/aws/"+account.ID, "GET")
			if err != nil {
				fmt.Printf("認可チェックエラー (aws: %s): %v\n", account.ID, err)
				continue
			}
			if allowed {
				allowedAccounts = append(allowedAccounts, account)
			}
		}

		c.JSON(http.StatusOK, allowedAccounts)
	})

	// AWSアカウント詳細を取得するAPI
	api.GET("/account/:id", func(c *gin.Context) {
		// 認可チェック
		subject := c.GetHeader("X-User-ID")
		if subject == "" {
			subject = "anonymous"
		}
		awsAccountID := c.Param("id")

		allowed, err := checkCasbinAuthorization(subject, "/aws/"+awsAccountID, "GET")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("認可チェックエラー: %v", err)})
			return
		}
		if !allowed {
			c.JSON(http.StatusForbidden, gin.H{"error": "アクセスが拒否されました"})
			return
		}

		awsAccount, err := queries.GetAwsAccount(c, awsAccountID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, awsAccount)
	})

	// AWSアカウント更新API
	api.PUT("/account/:id", func(c *gin.Context) {
		// 認可チェック
		subject := c.GetHeader("X-User-ID")
		if subject == "" {
			subject = "anonymous"
		}
		awsAccountID := c.Param("id")

		allowed, err := checkCasbinAuthorization(subject, "/aws/"+awsAccountID, "PUT")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("認可チェックエラー: %v", err)})
			return
		}
		if !allowed {
			c.JSON(http.StatusForbidden, gin.H{"error": "アクセスが拒否されました"})
			return
		}
		
		var req UpdateAwsAccountRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
			return
		}
		
		// アカウントの存在確認
		_, err = queries.GetAwsAccount(c, awsAccountID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "AWS account not found"})
			return
		}
		
		// アカウント情報を更新
		updatedAccount, err := queries.UpdateAwsAccount(c, sqlc.UpdateAwsAccountParams{
			ID:   awsAccountID,
			Name: req.Name,
			Note: req.Note,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update account: " + err.Error()})
			return
		}
		
		c.JSON(http.StatusOK, updatedAccount)
	})

	// システムIDでAWSアカウントを取得するAPI
	api.GET("/account/system/:systemId", func(c *gin.Context) {
		// 認可チェック
		subject := c.GetHeader("X-User-ID")
		if subject == "" {
			subject = "anonymous"
		}
		systemID := c.Param("systemId")

		allowed, err := checkCasbinAuthorization(subject, "/system/"+systemID, "GET")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("認可チェックエラー: %v", err)})
			return
		}
		if !allowed {
			c.JSON(http.StatusForbidden, gin.H{"error": "アクセスが拒否されました"})
			return
		}

		awsAccounts, err := queries.GetAwsAccountBySystemId(c, systemID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, awsAccounts)
	})

	// AWSアカウントに所属するユーザー一覧を取得するAPI
	api.GET("/account/:id/users", func(c *gin.Context) {
		// 認可チェック
		subject := c.GetHeader("X-User-ID")
		if subject == "" {
			subject = "anonymous"
		}
		awsAccountID := c.Param("id")

		allowed, err := checkCasbinAuthorization(subject, "/aws/"+awsAccountID, "GET")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("認可チェックエラー: %v", err)})
			return
		}
		if !allowed {
			c.JSON(http.StatusForbidden, gin.H{"error": "アクセスが拒否されました"})
			return
		}
		
		// 1. AWSアカウントに関連するユーザーIDを取得
		relations, err := queries.GetAwsAccountUsersByAwsAccountId(c, awsAccountID)
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
			c.JSON(http.StatusOK, []AwsUserInfo{})
			return
		}
		
		// 3. User Serviceから一括でユーザー情報を取得
		users, err := fetchUsersFromUserService(userIDs)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to fetch users: %v", err)})
			return
		}
		
		// 4. レスポンス用のデータを構成
		var result []AwsUserInfo
		userMap := make(map[string]UserInfo)
		for _, user := range users {
			userMap[user.ID] = user
		}
		
		for _, rel := range relations {
			if rel.UserID.Valid {
				if user, exists := userMap[rel.UserID.String]; exists {
					result = append(result, AwsUserInfo{
						UserID:         user.ID,
						UserName:       user.Name,
						UserEmail:      user.Email,
						AwsAccountID:   rel.ID,
						AwsAccountName: rel.Name,
					})
				}
			}
		}
		
		c.JSON(http.StatusOK, result)
	})

	// AWSアカウント削除API
	api.DELETE("/account/:id", func(c *gin.Context) {
		// 認可チェック
		subject := c.GetHeader("X-User-ID")
		if subject == "" {
			subject = "anonymous"
		}
		awsAccountID := c.Param("id")

		allowed, err := checkCasbinAuthorization(subject, "/aws/"+awsAccountID, "DELETE")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("認可チェックエラー: %v", err)})
			return
		}
		if !allowed {
			c.JSON(http.StatusForbidden, gin.H{"error": "アクセスが拒否されました"})
			return
		}
		
		c.JSON(http.StatusOK, gin.H{"message": "AWSアカウントが削除されました", "aws_account_id": awsAccountID})
	})

	// AWSアカウントメンバー管理API
	api.POST("/account/:id/members", func(c *gin.Context) {
		// 認可チェック
		subject := c.GetHeader("X-User-ID")
		if subject == "" {
			subject = "anonymous"
		}
		awsAccountID := c.Param("id")

		allowed, err := checkCasbinAuthorization(subject, "/aws/"+awsAccountID, "POST")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("認可チェックエラー: %v", err)})
			return
		}
		if !allowed {
			c.JSON(http.StatusForbidden, gin.H{"error": "メンバー管理権限がありません"})
			return
		}
		
		// メンバー追加の実装（実装例）
		c.JSON(http.StatusOK, gin.H{"message": "メンバーが追加されました", "aws_account_id": awsAccountID})
	})
} 