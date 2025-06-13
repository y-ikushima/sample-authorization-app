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