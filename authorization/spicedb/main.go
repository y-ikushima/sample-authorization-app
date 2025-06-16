package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gorilla/mux"
	"gopkg.in/yaml.v2"
)

type AuthRequest struct {
	Subject    string `json:"subject"`
	Resource   string `json:"resource"`
	Permission string `json:"permission"`
}

type AuthResponse struct {
	Allowed bool   `json:"allowed"`
	Reason  string `json:"reason,omitempty"`
}

type RelationshipRequest struct {
	Resource string `json:"resource"`
	Relation string `json:"relation"`
	Subject  string `json:"subject"`
}

// ユーザのロール（リレーションシップ）取得用の構造体を追加
type UserRolesRequest struct {
	User     string `json:"user"`
	Resource string `json:"resource,omitempty"` // オプション：特定のリソースに限定
}

type UserRolesResponse struct {
	User          string               `json:"user"`
	Relationships []UserRelationship   `json:"relationships"`
}

type UserRelationship struct {
	Resource string `json:"resource"`
	Relation string `json:"relation"`
}

// YAML設定ファイルの構造体
type RelationshipConfig struct {
	Relationships []Relationship `yaml:"relationships"`
}

type Relationship struct {
	Resource string `yaml:"resource"`
	Relation string `yaml:"relation"`
	Subject  string `yaml:"subject"`
}

// 権限マッピング（relation -> permissions）
var permissionMap = map[string][]string{
	"admin":      {"read", "write", "delete", "admin", "manage_members"},
	"admin_user": {"read", "write", "delete", "admin", "manage_members"},
	"owner":      {"read", "write", "delete", "admin", "manage_members"},
	"manager":    {"read", "write", "delete"},
	"staff":      {"read"},
}

// 実行時に設定ファイルから読み込まれるリレーションシップ
var relationships []Relationship

// CORSミドルウェア
func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// CORSヘッダーを設定
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		
		// OPTIONSリクエストの場合はここで終了
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		next.ServeHTTP(w, r)
	})
}

func main() {
	fmt.Println("Initializing SpiceDB Authorization Server...")

	// 設定ファイルの読み込み
	if err := loadRelationships(); err != nil {
		log.Fatal("Failed to load relationships:", err)
	}

	router := mux.NewRouter()

	// API endpoints
	router.HandleFunc("/authorize", authorizeHandler).Methods("POST")
	router.HandleFunc("/authorize", optionsHandler).Methods("OPTIONS")
	router.HandleFunc("/relationships", getRelationshipsHandler).Methods("GET")
	router.HandleFunc("/relationships", addRelationshipHandler).Methods("POST")
	router.HandleFunc("/relationships", removeRelationshipHandler).Methods("DELETE")
	router.HandleFunc("/relationships", optionsHandler).Methods("OPTIONS")
	
	// ユーザロール管理エンドポイントを追加
	router.HandleFunc("/user-roles", getUserRolesHandler).Methods("GET", "POST")
	router.HandleFunc("/user-roles", optionsHandler).Methods("OPTIONS")
	router.HandleFunc("/add-user-role", addUserRoleHandler).Methods("POST")
	router.HandleFunc("/add-user-role", optionsHandler).Methods("OPTIONS")
	router.HandleFunc("/remove-user-role", removeUserRoleHandler).Methods("POST")
	router.HandleFunc("/remove-user-role", optionsHandler).Methods("OPTIONS")
	
	router.HandleFunc("/health", healthHandler).Methods("GET")
	router.HandleFunc("/health", optionsHandler).Methods("OPTIONS")

	// CORS対応
	corsHandler := enableCORS(router)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	fmt.Printf("SpiceDB Authorization Server starting on port %s\n", port)
	fmt.Printf("Loaded %d relationships from config file\n", len(relationships))
	log.Fatal(http.ListenAndServe(":"+port, corsHandler))
}

func loadRelationships() error {
	// 設定ファイルのパス
	configPath := "./relationships.yaml"
	if _, err := os.Stat("/app/relationships.yaml"); err == nil {
		configPath = "/app/relationships.yaml" // Docker環境用
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		return fmt.Errorf("failed to read config file: %v", err)
	}

	var config RelationshipConfig
	if err := yaml.Unmarshal(data, &config); err != nil {
		return fmt.Errorf("failed to parse YAML: %v", err)
	}

	relationships = config.Relationships
	return nil
}

func authorizeHandler(w http.ResponseWriter, r *http.Request) {
	var authReq AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&authReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// 認可チェック
	allowed := checkPermission(authReq.Subject, authReq.Resource, authReq.Permission)

	authResponse := AuthResponse{
		Allowed: allowed,
	}

	if !allowed {
		authResponse.Reason = fmt.Sprintf("User %s does not have %s permission on %s", 
			authReq.Subject, authReq.Permission, authReq.Resource)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(authResponse)
}

func checkPermission(subject, resource, permission string) bool {
	// subjectが "user:" プレフィックス付きの場合は除去
	subject = strings.TrimPrefix(subject, "user:")

	// 該当するリレーションシップを検索
	for _, rel := range relationships {
		// subjectのマッチング
		relSubject := strings.TrimPrefix(rel.Subject, "user:")
		
		if relSubject == subject && rel.Resource == resource {
			// relationに基づいて権限チェック
			if permissions, exists := permissionMap[rel.Relation]; exists {
				for _, perm := range permissions {
					if perm == permission {
						return true
					}
				}
			}
		}
	}

	return false
}

func getRelationshipsHandler(w http.ResponseWriter, r *http.Request) {
	// 設定ファイルから読み込んだリレーションシップを返す
	relationshipData := make([]map[string]string, len(relationships))
	for i, rel := range relationships {
		relationshipData[i] = map[string]string{
			"resource": rel.Resource,
			"relation": rel.Relation,
			"subject":  rel.Subject,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"relationships": relationshipData,
	})
}

func addRelationshipHandler(w http.ResponseWriter, r *http.Request) {
	var relReq RelationshipRequest
	if err := json.NewDecoder(r.Body).Decode(&relReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// 新しいリレーションシップをメモリに追加
	newRel := Relationship(relReq)
	relationships = append(relationships, newRel)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"added":        true,
		"relationship": relReq,
		"note":         "メモリに追加されました（再起動時に失われます）",
	})
}

func removeRelationshipHandler(w http.ResponseWriter, r *http.Request) {
	var relReq RelationshipRequest
	if err := json.NewDecoder(r.Body).Decode(&relReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// リレーションシップを削除
	removed := false
	for i, rel := range relationships {
		if rel.Resource == relReq.Resource && rel.Relation == relReq.Relation && rel.Subject == relReq.Subject {
			relationships = append(relationships[:i], relationships[i+1:]...)
			removed = true
			break
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"removed":      removed,
		"relationship": relReq,
		"note":         "メモリから削除されました（再起動時に設定ファイルから再読み込みされます）",
	})
}

// ユーザのロール（リレーションシップ）一覧を取得するハンドラ
func getUserRolesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		// GETの場合：クエリパラメータからユーザーIDとリソースを取得
		user := r.URL.Query().Get("user")
		if user == "" {
			http.Error(w, "User parameter is required", http.StatusBadRequest)
			return
		}
		resource := r.URL.Query().Get("resource") // オプション

		fmt.Printf("Getting roles for user: %s, resource: %s\n", user, resource)

		relationships := getUserRelationships(user, resource)

		response := UserRolesResponse{
			User:          user,
			Relationships: relationships,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		
	} else if r.Method == "POST" {
		// POSTの場合：JSONボディから取得
		var userRolesReq UserRolesRequest
		if err := json.NewDecoder(r.Body).Decode(&userRolesReq); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if userRolesReq.User == "" {
			http.Error(w, "User is required", http.StatusBadRequest)
			return
		}

		fmt.Printf("Getting roles for user: %s, resource: %s\n", userRolesReq.User, userRolesReq.Resource)

		relationships := getUserRelationships(userRolesReq.User, userRolesReq.Resource)

		response := UserRolesResponse{
			User:          userRolesReq.User,
			Relationships: relationships,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	} else {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// ユーザのリレーションシップを取得するヘルパー関数
func getUserRelationships(user, resourceFilter string) []UserRelationship {
	var userRelationships []UserRelationship
	
	// subjectが "user:" プレフィックス付きの場合は除去
	cleanUser := strings.TrimPrefix(user, "user:")
	
	for _, rel := range relationships {
		// subjectのマッチング
		relSubject := strings.TrimPrefix(rel.Subject, "user:")
		
		if relSubject == cleanUser {
			// リソースフィルターが指定されている場合はそれに一致するもののみ
			if resourceFilter == "" || rel.Resource == resourceFilter {
				userRelationships = append(userRelationships, UserRelationship{
					Resource: rel.Resource,
					Relation: rel.Relation,
				})
			}
		}
	}
	
	return userRelationships
}

// ユーザにロール（リレーションシップ）を追加するハンドラ
func addUserRoleHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var relReq RelationshipRequest
	if err := json.NewDecoder(r.Body).Decode(&relReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if relReq.Resource == "" || relReq.Relation == "" || relReq.Subject == "" {
		http.Error(w, "Resource, relation, and subject are required", http.StatusBadRequest)
		return
	}

	fmt.Printf("Adding role: user=%s, resource=%s, relation=%s\n", relReq.Subject, relReq.Resource, relReq.Relation)

	// 新しいリレーションシップをメモリに追加
	newRel := Relationship(relReq)
	relationships = append(relationships, newRel)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"added":        true,
		"relationship": relReq,
	})
}

// ユーザからロール（リレーションシップ）を削除するハンドラ
func removeUserRoleHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var relReq RelationshipRequest
	if err := json.NewDecoder(r.Body).Decode(&relReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if relReq.Resource == "" || relReq.Relation == "" || relReq.Subject == "" {
		http.Error(w, "Resource, relation, and subject are required", http.StatusBadRequest)
		return
	}

	fmt.Printf("Removing role: user=%s, resource=%s, relation=%s\n", relReq.Subject, relReq.Resource, relReq.Relation)

	// リレーションシップを削除
	removed := false
	for i, rel := range relationships {
		if rel.Resource == relReq.Resource && rel.Relation == relReq.Relation && rel.Subject == relReq.Subject {
			relationships = append(relationships[:i], relationships[i+1:]...)
			removed = true
			break
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"removed":      removed,
		"relationship": relReq,
	})
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":        "healthy",
		"service":       "spicedb-authorization-server",
		"relationships": fmt.Sprintf("%d loaded from config", len(relationships)),
	})
}

func optionsHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
} 