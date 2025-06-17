package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

// Casbin ServiceのURLを環境変数から取得（デフォルト値付き）
var casbinServiceURL = func() string {
	if url := os.Getenv("CASBIN_SERVICE_URL"); url != "" {
		return url
	}
	return "http://casbin-server:8080"
}()

// SpiceDB ServiceのURLを環境変数から取得（デフォルト値付き）
var spiceDBServiceURL = func() string {
	if url := os.Getenv("SPICEDB_SERVICE_URL"); url != "" {
		return url
	}
	return "http://spicedb-server:8082"
}()

// OPA ServiceのURLを環境変数から取得（デフォルト値付き）
var opaServiceURL = func() string {
	if url := os.Getenv("OPA_SERVICE_URL"); url != "" {
		return url
	}
	return "http://opa-server:8081"
}()

// SpiceDB認証キーを環境変数から取得
var spiceDBAuthKey = func() string {
	if key := os.Getenv("SPICEDB_AUTH_KEY"); key != "" {
		return key
	}
	return "spicedb-secret-key"
}()



// Casbin 認可用の構造体
type AuthRequest struct {
	Subject string `json:"subject"`
	Object  string `json:"object"`
	Action  string `json:"action"`
}

type AuthResponse struct {
	Allowed bool   `json:"allowed"`
	Reason  string `json:"reason,omitempty"`
}

// SpiceDB 認可用の構造体
type SpiceDBAuthRequest struct {
	Subject    string `json:"subject"`
	Resource   string `json:"resource"`
	Permission string `json:"permission"`
}

type SpiceDBAuthResponse struct {
	Allowed bool   `json:"allowed"`
	Reason  string `json:"reason,omitempty"`
}

// OPA 認可用の構造体
type OPAAuthRequest struct {
	Subject    string `json:"subject"`
	Resource   string `json:"resource"`
	Permission string `json:"permission"`
}

type OPAAuthResponse struct {
	Allowed bool   `json:"allowed"`
	Reason  string `json:"reason,omitempty"`
}



// 公式SpiceDB API用の構造体
type SpiceDBCheckRequest struct {
	Resource struct {
		ObjectType string `json:"objectType"`
		ObjectId   string `json:"objectId"`
	} `json:"resource"`
	Permission string `json:"permission"`
	Subject    struct {
		Object struct {
			ObjectType string `json:"objectType"`
			ObjectId   string `json:"objectId"`
		} `json:"object"`
	} `json:"subject"`
}

type SpiceDBCheckResponse struct {
	Permissionship string `json:"permissionship"`
}

// Casbinサービスで認可チェックを行う関数
func checkAuthorization(subject, object, action string) (bool, error) {
	authReq := AuthRequest{
		Subject: subject,
		Object:  object,
		Action:  action,
	}

	jsonData, err := json.Marshal(authReq)
	if err != nil {
		return false, fmt.Errorf("failed to marshal auth request: %w", err)
	}

	// Casbinサービスに認可リクエストを送信
	resp, err := http.Post(casbinServiceURL+"/authorize", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return false, fmt.Errorf("failed to call casbin service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("casbin service returned status: %d", resp.StatusCode)
	}

	// レスポンスを読み取り
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, fmt.Errorf("failed to read response: %w", err)
	}

	// JSONをパース
	var authResp AuthResponse
	if err := json.Unmarshal(body, &authResp); err != nil {
		return false, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return authResp.Allowed, nil
}

// SpiceDBサービスで認可チェックを行う関数
func checkSpiceDBAuthorization(subject, resource, permission string) (bool, error) {
	fmt.Printf("🔍 SpiceDB認可チェック開始: subject=%s, resource=%s, permission=%s\n", subject, resource, permission)
	fmt.Printf("🌐 SpiceDB URL: %s\n", spiceDBServiceURL)
	
	// resourceを分割してobjectTypeとobjectIdを取得
	parts := strings.Split(resource, ":")
	if len(parts) != 2 {
		fmt.Printf("❌ Invalid resource format: %s\n", resource)
		return false, fmt.Errorf("invalid resource format: %s", resource)
	}
	
	objectType := parts[0]
	objectId := parts[1]
	
	fmt.Printf("📋 Parsed resource: objectType=%s, objectId=%s\n", objectType, objectId)

	// 公式SpiceDB APIリクエスト構造体を作成
	checkReq := SpiceDBCheckRequest{}
	checkReq.Resource.ObjectType = objectType
	checkReq.Resource.ObjectId = objectId
	checkReq.Permission = permission
	checkReq.Subject.Object.ObjectType = "user"
	checkReq.Subject.Object.ObjectId = subject

	jsonData, err := json.Marshal(checkReq)
	if err != nil {
		fmt.Printf("❌ JSON marshal error: %v\n", err)
		return false, fmt.Errorf("failed to marshal SpiceDB check request: %w", err)
	}
	
	fmt.Printf("📤 SpiceDB request: %s\n", string(jsonData))

	// 公式SpiceDBサービスに認可リクエストを送信
	req, err := http.NewRequest("POST", spiceDBServiceURL+"/v1/permissions/check", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Printf("❌ Request creation error: %v\n", err)
		return false, fmt.Errorf("failed to create SpiceDB request: %w", err)
	}

	// 認証ヘッダーを追加
	req.Header.Set("Authorization", "Bearer "+spiceDBAuthKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("❌ HTTP request error: %v\n", err)
		return false, fmt.Errorf("failed to call SpiceDB service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Printf("❌ SpiceDB returned status: %d\n", resp.StatusCode)
		return false, fmt.Errorf("SpiceDB service returned status: %d", resp.StatusCode)
	}

	var bodyBytes []byte
	bodyBytes, err = io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("❌ Response read error: %v\n", err)
		return false, fmt.Errorf("failed to read SpiceDB response: %w", err)
	}
	
	fmt.Printf("📥 SpiceDB response: %s\n", string(bodyBytes))

	var checkResp SpiceDBCheckResponse
	if err := json.Unmarshal(bodyBytes, &checkResp); err != nil {
		fmt.Printf("❌ Response unmarshal error: %v\n", err)
		return false, fmt.Errorf("failed to unmarshal SpiceDB response: %w", err)
	}

	// PERMISSIONSHIP_HAS_PERMISSIONの場合は権限あり
	hasPermission := checkResp.Permissionship == "PERMISSIONSHIP_HAS_PERMISSION"
	fmt.Printf("✅ SpiceDB認可チェック結果: %t (permissionship=%s)\n", hasPermission, checkResp.Permissionship)
	
	return hasPermission, nil
}

// グローバル管理者権限をチェックする関数
func checkGlobalAdminPermission(subject string) (bool, error) {
	return checkSpiceDBAuthorization(subject, "global:main", "full_access")
}

// SpiceDB認可チェック（グローバル管理者権限も含む）
func checkSpiceDBAuthorizationWithGlobal(subject, resource, permission string) (bool, error) {
	// まずグローバル管理者権限をチェック
	if hasGlobalPermission, err := checkGlobalAdminPermission(subject); err == nil && hasGlobalPermission {
		return true, nil
	}

	// 通常の権限チェック
	return checkSpiceDBAuthorization(subject, resource, permission)
}

// OPAサービスで認可チェックを行う関数
func checkOPAAuthorization(subject, resource, permission string) (bool, error) {
	authReq := OPAAuthRequest{
		Subject:    subject,
		Resource:   resource,
		Permission: permission,
	}

	jsonData, err := json.Marshal(authReq)
	if err != nil {
		return false, fmt.Errorf("failed to marshal OPA auth request: %w", err)
	}

	// OPAサービスに認可リクエストを送信
	resp, err := http.Post(opaServiceURL+"/authorize", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return false, fmt.Errorf("failed to call OPA service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("OPA service returned status: %d", resp.StatusCode)
	}

	// レスポンスを読み取り
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, fmt.Errorf("failed to read OPA response: %w", err)
	}

	// JSONをパース
	var authResp OPAAuthResponse
	if err := json.Unmarshal(body, &authResp); err != nil {
		return false, fmt.Errorf("failed to unmarshal OPA response: %w", err)
	}

	return authResp.Allowed, nil
}

// OPAグローバル管理者権限をチェックする関数
func checkOPAGlobalAdminPermission(subject string) (bool, error) {
	return checkOPAAuthorization(subject, "global:main", "admin")
}

// OPA認可チェック（グローバル管理者権限も含む）
func checkOPAAuthorizationWithGlobal(subject, resource, permission string) (bool, error) {
	// まずグローバル管理者権限をチェック
	if globalAdmin, err := checkOPAGlobalAdminPermission(subject); err == nil && globalAdmin {
		return true, nil
	}

	// 通常の権限チェック
	return checkOPAAuthorization(subject, resource, permission)
} 