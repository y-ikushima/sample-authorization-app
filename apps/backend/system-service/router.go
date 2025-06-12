// router.go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"system-service/db/sqlc"

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

type SystemUserInfo struct {
	UserID    string `json:"user_id"`
	UserName  string `json:"user_name"`
	UserEmail string `json:"user_email"`
	SystemID  string `json:"system_id"`
}

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

	// 🎯 システムに所属するユーザの名称一覧を取得するAPI
	r.GET("/system/:id/users", func(c *gin.Context) {
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
	
	return r
}

// User Serviceからユーザー情報を一括取得する関数
func fetchUsersFromUserService(userIDs []string) ([]UserInfo, error) {
	// User ServiceのURL（環境変数から取得）
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