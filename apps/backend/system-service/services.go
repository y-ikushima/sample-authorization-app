package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

// User ServiceのURLを環境変数から取得（デフォルト値付き）
var userServiceURL = func() string {
	if url := os.Getenv("USER_SERVICE_URL"); url != "" {
		return url
	}
	return "http://user-service:3003/api"
}()

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