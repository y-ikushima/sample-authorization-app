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

// SpiceDB ServiceのURLを環境変数から取得（デフォルト値付き）
var spiceDBServiceURL = func() string {
	if url := os.Getenv("SPICEDB_SERVICE_URL"); url != "" {
		return url
	}
	return "http://spicedb-server:8082"
}()

// SpiceDB認証キーを環境変数から取得
var spiceDBAuthKey = func() string {
	if key := os.Getenv("SPICEDB_AUTH_KEY"); key != "" {
		return key
	}
	return "spicedb-secret-key"
}()

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

// SpiceDBサービスで認可チェックを行う関数
func checkSpiceDBAuthorization(subject, resource, permission string) (bool, error) {
	// resourceを分割してobjectTypeとobjectIdを取得
	parts := strings.Split(resource, ":")
	if len(parts) != 2 {
		return false, fmt.Errorf("invalid resource format: %s", resource)
	}
	
	objectType := parts[0]
	objectId := parts[1]

	// 公式SpiceDB APIリクエスト構造体を作成
	checkReq := SpiceDBCheckRequest{}
	checkReq.Resource.ObjectType = objectType
	checkReq.Resource.ObjectId = objectId
	checkReq.Permission = permission
	checkReq.Subject.Object.ObjectType = "user"
	checkReq.Subject.Object.ObjectId = subject

	jsonData, err := json.Marshal(checkReq)
	if err != nil {
		return false, fmt.Errorf("failed to marshal SpiceDB check request: %w", err)
	}

	// 公式SpiceDBサービスに認可リクエストを送信
	req, err := http.NewRequest("POST", spiceDBServiceURL+"/v1/permissions/check", bytes.NewBuffer(jsonData))
	if err != nil {
		return false, fmt.Errorf("failed to create SpiceDB request: %w", err)
	}

	// 認証ヘッダーを追加
	req.Header.Set("Authorization", "Bearer "+spiceDBAuthKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return false, fmt.Errorf("failed to call SpiceDB service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("SpiceDB service returned status: %d", resp.StatusCode)
	}

	var bodyBytes []byte
	bodyBytes, err = io.ReadAll(resp.Body)
	if err != nil {
		return false, fmt.Errorf("failed to read SpiceDB response: %w", err)
	}

	var checkResp SpiceDBCheckResponse
	if err := json.Unmarshal(bodyBytes, &checkResp); err != nil {
		return false, fmt.Errorf("failed to unmarshal SpiceDB response: %w", err)
	}

	// PERMISSIONSHIP_HAS_PERMISSIONの場合は権限あり
	return checkResp.Permissionship == "PERMISSIONSHIP_HAS_PERMISSION", nil
}

// グローバル管理者権限チェック
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

// Casbin ServiceのURLを環境変数から取得（デフォルト値付き）
var casbinServiceURL = func() string {
	if url := os.Getenv("CASBIN_SERVICE_URL"); url != "" {
		return url
	}
	return "http://casbin-server:8080"
}()

// Casbin 認可用の構造体
type CasbinAuthRequest struct {
	Subject string `json:"subject"`
	Object  string `json:"object"`
	Action  string `json:"action"`
}

type CasbinAuthResponse struct {
	Allowed bool   `json:"allowed"`
	Reason  string `json:"reason,omitempty"`
}

// Casbinサービスで認可チェックを行う関数
func checkCasbinAuthorization(subject, resource, permission string) (bool, error) {
	authReq := CasbinAuthRequest{
		Subject: subject,
		Object:  resource,
		Action:  permission,
	}

	jsonData, err := json.Marshal(authReq)
	if err != nil {
		return false, fmt.Errorf("failed to marshal Casbin auth request: %w", err)
	}

	// Casbinサービスに認可リクエストを送信
	resp, err := http.Post(casbinServiceURL+"/authorize", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return false, fmt.Errorf("failed to call Casbin service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("Casbin service returned status: %d", resp.StatusCode)
	}

	// レスポンスを読み取り
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, fmt.Errorf("failed to read Casbin response: %w", err)
	}

	// JSONをパース
	var authResp CasbinAuthResponse
	if err := json.Unmarshal(body, &authResp); err != nil {
		return false, fmt.Errorf("failed to unmarshal Casbin response: %w", err)
	}

	return authResp.Allowed, nil
}

// Casbin認可チェック（グローバル管理者権限も含む）
func checkCasbinAuthorizationWithGlobal(subject, resource, permission string) (bool, error) {
	// まずグローバル管理者権限をチェック（Casbinサービス経由）
	if globalAdmin, err := checkCasbinAuthorization(subject, "global:main", "admin"); err == nil && globalAdmin {
		return true, nil
	}

	// 通常の権限チェック
	return checkCasbinAuthorization(subject, resource, permission)
}

// OPA ServiceのURLを環境変数から取得（デフォルト値付き）
var opaServiceURL = func() string {
	if url := os.Getenv("OPA_SERVICE_URL"); url != "" {
		return url
	}
	return "http://opa-server:8081"
}()

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

// OPA認可チェック（グローバル管理者権限も含む）
func checkOPAAuthorizationWithGlobal(subject, resource, permission string) (bool, error) {
	// まずグローバル管理者権限をチェック（OPAサービス経由）
	if globalAdmin, err := checkOPAAuthorization(subject, "global:main", "admin"); err == nil && globalAdmin {
		return true, nil
	}

	// 通常の権限チェック
	return checkOPAAuthorization(subject, resource, permission)
} 