// router.go
package main

import (
	"aws-service/db/sqlc"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// User Service のレスポンス構造体
type UserInfo struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

type BatchUsersRequest struct {
	UserIDs []string `json:"user_ids"`
}

type AwsUserInfo struct {
	UserID          string `json:"user_id"`
	UserName        string `json:"user_name"`
	UserEmail       string `json:"user_email"`
	AwsAccountID    string `json:"aws_account_id"`
	AwsAccountName  string `json:"aws_account_name"`
}

// AWSアカウント更新用のリクエスト構造体
type UpdateAwsAccountRequest struct {
	Name string `json:"Name" binding:"required"`
	Note string `json:"Note"`
}

// User ServiceのURLを環境変数から取得（デフォルト値付き）
var userServiceURL = func() string {
	if url := os.Getenv("USER_SERVICE_URL"); url != "" {
		return url
	}
	return "http://user-service:3003/api"
}()

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

func setupRoutes(api *gin.RouterGroup, queries *sqlc.Queries) {

	api.GET("/account/all", func(c *gin.Context) {
		awsAccounts, err := queries.GetAwsAccounts(c)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, awsAccounts)
	})

	api.GET("/account/:id", func(c *gin.Context) {
		awsAccount, err := queries.GetAwsAccount(c, c.Param("id"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, awsAccount)
	})

	// AWSアカウント更新エンドポイント
	api.PUT("/account/:id", func(c *gin.Context) {
		accountID := c.Param("id")
		
		var req UpdateAwsAccountRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
			return
		}
		
		// アカウントの存在確認
		_, err := queries.GetAwsAccount(c, accountID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "AWS account not found"})
			return
		}
		
		// アカウント情報を更新
		updatedAccount, err := queries.UpdateAwsAccount(c, sqlc.UpdateAwsAccountParams{
			ID:   accountID,
			Name: req.Name,
			Note: req.Note,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update account: " + err.Error()})
			return
		}
		
		c.JSON(http.StatusOK, updatedAccount)
	})

	api.GET("/account/system/:systemId", func(c *gin.Context) {
		awsAccounts, err := queries.GetAwsAccountBySystemId(c, c.Param("systemId"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, awsAccounts)
	})

	// AWSアカウントに所属するユーザー一覧を取得（ユーザー情報も含む）
	api.GET("/account/:id/users", func(c *gin.Context) {
		awsAccountID := c.Param("id")
		
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

}

// User Serviceからユーザー情報を一括取得する関数
func fetchUsersFromUserService(userIDs []string) ([]UserInfo, error) {
	// User ServiceのURL
	url := userServiceURL + "/users/batch"
	
	// リクエストボディを作成
	requestBody := BatchUsersRequest{
		UserIDs: userIDs,
	}
	
	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}
	
	// HTTP POSTリクエストを送信
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to call user service: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("user service returned status: %d", resp.StatusCode)
	}
	
	// レスポンスを読み取り
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}
	
	// JSONをパース
	var users []UserInfo
	if err := json.Unmarshal(body, &users); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}
	
	return users, nil
}