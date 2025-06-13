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

// SpiceDBサービスで認可チェックを行う関数
func checkSpiceDBAuthorization(subject, resource, permission string) (bool, error) {
	// subjectにuser:プレフィックスを追加（SpiceDBの要求に合わせる）
	if subject != "anonymous" && !strings.HasPrefix(subject, "user:") {
		subject = "user:" + subject
	}

	authReq := SpiceDBAuthRequest{
		Subject:    subject,
		Resource:   resource,
		Permission: permission,
	}

	jsonData, err := json.Marshal(authReq)
	if err != nil {
		return false, fmt.Errorf("failed to marshal SpiceDB auth request: %w", err)
	}

	// SpiceDBサービスに認可リクエストを送信
	resp, err := http.Post(spiceDBServiceURL+"/authorize", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return false, fmt.Errorf("failed to call SpiceDB service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("SpiceDB service returned status: %d", resp.StatusCode)
	}

	// レスポンスを読み取り
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, fmt.Errorf("failed to read SpiceDB response: %w", err)
	}

	// JSONをパース
	var authResp SpiceDBAuthResponse
	if err := json.Unmarshal(body, &authResp); err != nil {
		return false, fmt.Errorf("failed to unmarshal SpiceDB response: %w", err)
	}

	return authResp.Allowed, nil
}

// グローバル管理者権限をチェックする関数
func checkGlobalAdminPermission(subject string) (bool, error) {
	return checkSpiceDBAuthorization(subject, "global:main", "admin")
}

// SpiceDB認可チェック（グローバル管理者権限も含む）
func checkSpiceDBAuthorizationWithGlobal(subject, resource, permission string) (bool, error) {
	// まずグローバル管理者権限をチェック
	if globalAdmin, err := checkGlobalAdminPermission(subject); err == nil && globalAdmin {
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