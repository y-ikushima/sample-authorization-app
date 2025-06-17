package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"regexp"
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

// Zedスキーマ定義の構造体
type ZedSchema struct {
	Definitions map[string]*Definition
}

type Definition struct {
	Name        string
	Relations   map[string]string // relation name -> subject type
	Permissions map[string]string // permission name -> expression
}

// 権限マッピング（relation -> permissions）- Zedスキーマから動的に構築
var permissionMap = map[string][]string{}

// Zedスキーマから読み込まれた定義
var zedSchema *ZedSchema

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

	// Zedスキーマファイルの読み込み
	if err := loadZedSchema(); err != nil {
		log.Fatal("Failed to load Zed schema:", err)
	}

	// 設定ファイルの読み込み
	if err := loadRelationships(); err != nil {
		log.Fatal("Failed to load relationships:", err)
	}

	// Zedスキーマから権限マッピングを構築
	buildPermissionMap()

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
	
	// Zedスキーマ情報エンドポイントを追加
	router.HandleFunc("/schema", getSchemaHandler).Methods("GET")
	router.HandleFunc("/schema", optionsHandler).Methods("OPTIONS")
	
	router.HandleFunc("/health", healthHandler).Methods("GET")
	router.HandleFunc("/health", optionsHandler).Methods("OPTIONS")

	// CORS対応
	corsHandler := enableCORS(router)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	fmt.Printf("SpiceDB Authorization Server starting on port %s\n", port)
	fmt.Printf("Loaded %d definitions from Zed schema\n", len(zedSchema.Definitions))
	fmt.Printf("Loaded %d relationships from config file\n", len(relationships))
	log.Fatal(http.ListenAndServe(":"+port, corsHandler))
}

// Zedスキーマファイルを読み込み、解析する
func loadZedSchema() error {
	// スキーマファイルのパス
	schemaPath := "./schema.zed"
	if _, err := os.Stat("/app/schema.zed"); err == nil {
		schemaPath = "/app/schema.zed" // Docker環境用
	}

	file, err := os.Open(schemaPath)
	if err != nil {
		return fmt.Errorf("failed to open schema file: %v", err)
	}
	defer file.Close()

	zedSchema = &ZedSchema{
		Definitions: make(map[string]*Definition),
	}

	scanner := bufio.NewScanner(file)
	var currentDefinition *Definition
	
	// 正規表現パターン
	definitionPattern := regexp.MustCompile(`^definition\s+(\w+)\s*\{`)
	relationPattern := regexp.MustCompile(`^\s*relation\s+(\w+):\s*(\w+)`)
	permissionPattern := regexp.MustCompile(`^\s*permission\s+(\w+)\s*=\s*(.+)`)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		
		// コメントと空行をスキップ
		if strings.HasPrefix(line, "//") || strings.HasPrefix(line, "/*") || strings.HasPrefix(line, "*") || line == "" {
			continue
		}

		// definition の開始
		if matches := definitionPattern.FindStringSubmatch(line); matches != nil {
			defName := matches[1]
			currentDefinition = &Definition{
				Name:        defName,
				Relations:   make(map[string]string),
				Permissions: make(map[string]string),
			}
			zedSchema.Definitions[defName] = currentDefinition
			continue
		}

		// relation の定義
		if currentDefinition != nil {
			if matches := relationPattern.FindStringSubmatch(line); matches != nil {
				relationName := matches[1]
				subjectType := matches[2]
				currentDefinition.Relations[relationName] = subjectType
				continue
			}

			// permission の定義
			if matches := permissionPattern.FindStringSubmatch(line); matches != nil {
				permissionName := matches[1]
				expression := strings.TrimSpace(matches[2])
				currentDefinition.Permissions[permissionName] = expression
				continue
			}
		}

		// definition の終了
		if line == "}" {
			currentDefinition = nil
		}
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading schema file: %v", err)
	}

	fmt.Printf("Parsed Zed schema: %d definitions loaded\n", len(zedSchema.Definitions))
	for defName, def := range zedSchema.Definitions {
		fmt.Printf("  - %s: %d relations, %d permissions\n", defName, len(def.Relations), len(def.Permissions))
	}

	return nil
}

// Zedスキーマから権限マッピングを構築
func buildPermissionMap() {
	permissionMap = make(map[string][]string)
	
	// 各定義から権限を抽出
	for _, def := range zedSchema.Definitions {
		for relationName := range def.Relations {
			var permissions []string
			
			// 各権限定義をチェックして、このrelationが含まれているかを確認
			for permName, expression := range def.Permissions {
				if strings.Contains(expression, relationName) {
					permissions = append(permissions, permName)
				}
			}
			
			if len(permissions) > 0 {
				permissionMap[relationName] = permissions
			}
		}
	}
	
	fmt.Printf("Built permission map from Zed schema:\n")
	for relation, perms := range permissionMap {
		fmt.Printf("  - %s: %v\n", relation, perms)
	}
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

// Zedスキーマ情報を返すハンドラ
func getSchemaHandler(w http.ResponseWriter, r *http.Request) {
	schemaInfo := make(map[string]interface{})
	
	for defName, def := range zedSchema.Definitions {
		schemaInfo[defName] = map[string]interface{}{
			"relations":   def.Relations,
			"permissions": def.Permissions,
		}
	}
	
	response := map[string]interface{}{
		"schema":           schemaInfo,
		"permission_map":   permissionMap,
		"total_definitions": len(zedSchema.Definitions),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
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
			// relationに基づいて権限チェック（Zedスキーマから構築された権限マップを使用）
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