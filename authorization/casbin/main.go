package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/casbin/casbin/v2"
	gormadapter "github.com/casbin/gorm-adapter/v3"
	"github.com/gorilla/mux"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type AuthRequest struct {
	Subject string `json:"subject"`
	Object  string `json:"object"`
	Action  string `json:"action"`
}

type AuthResponse struct {
	Allowed bool   `json:"allowed"`
	Reason  string `json:"reason,omitempty"`
}

type PolicyRequest struct {
	Policy []string `json:"policy"`
}

var enforcer *casbin.Enforcer

// PostgreSQL接続関数
func connectToPostgreSQL() *gorm.DB {
	dbHost := os.Getenv("CASBIN_DB_HOST")
	if dbHost == "" {
		dbHost = "localhost"
	}
	
	dbPort := os.Getenv("CASBIN_DB_PORT")
	if dbPort == "" {
		dbPort = "5437"
	}

	dbUser := os.Getenv("CASBIN_DB_USER")
	if dbUser == "" {
		dbUser = "casbin"
	}

	dbPassword := os.Getenv("CASBIN_DB_PASSWORD")
	if dbPassword == "" {
		dbPassword = "casbin123"
	}

	dbName := os.Getenv("CASBIN_DB_NAME")
	if dbName == "" {
		dbName = "casbin"
	}

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Tokyo",
		dbHost, dbUser, dbPassword, dbName, dbPort)

	// データベースに接続するまでリトライ
	var db *gorm.DB
	var err error
	for i := 0; i < 30; i++ {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err == nil {
			break
		}
		log.Printf("Database connection attempt %d failed: %v", i+1, err)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		log.Printf("Failed to connect to database after 30 attempts: %v", err)
		return nil
	}

	log.Println("Successfully connected to PostgreSQL database")
	return db
}

// CSVからPostgreSQLにポリシーをロード
func loadInitialPolicies(adapter *gormadapter.Adapter) error {
	csvPath := "./policy.csv"
	if _, err := os.Stat("/app/policy.csv"); err == nil {
		csvPath = "/app/policy.csv"
	} else if _, err := os.Stat("data/policy.csv"); err == nil {
		csvPath = "data/policy.csv"
	}

	if _, err := os.Stat(csvPath); os.IsNotExist(err) {
		log.Printf("Policy CSV file not found at %s", csvPath)
		return nil
	}

	modelPath := "./model.conf"
	if _, err := os.Stat("/app/model.conf"); err == nil {
		modelPath = "/app/model.conf"
	} else if _, err := os.Stat("data/model.conf"); err == nil {
		modelPath = "data/model.conf"
	}

	// 一時的にファイルベースのenforcerを作成してポリシーを読み込み
	tempEnforcer, err := casbin.NewEnforcer(modelPath, csvPath)
	if err != nil {
		return fmt.Errorf("failed to create temporary enforcer: %v", err)
	}

	// 既存のポリシーを削除
	for _, policy := range enforcer.GetPolicy() {
		enforcer.RemovePolicy(policy)
	}
	for _, grouping := range enforcer.GetGroupingPolicy() {
		enforcer.RemoveGroupingPolicy(grouping)
	}

	// ポリシーをデータベースに保存
	for _, policy := range tempEnforcer.GetPolicy() {
		enforcer.AddPolicy(policy)
	}

	for _, grouping := range tempEnforcer.GetGroupingPolicy() {
		enforcer.AddGroupingPolicy(grouping)
	}

	// データベースに保存
	enforcer.SavePolicy()

	log.Println("Initial policies loaded from CSV to PostgreSQL")
	return nil
}

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
	// Casbinのモデルとポリシーファイルの初期化
	initializeCasbin()

	router := mux.NewRouter()

	// API endpoints
	router.HandleFunc("/authorize", authorizeHandler).Methods("POST")
	router.HandleFunc("/authorize", optionsHandler).Methods("OPTIONS")
	router.HandleFunc("/policies", getPoliciesHandler).Methods("GET")
	router.HandleFunc("/policies", addPolicyHandler).Methods("POST")
	router.HandleFunc("/policies", removePolicyHandler).Methods("DELETE")
	router.HandleFunc("/policies", optionsHandler).Methods("OPTIONS")
	router.HandleFunc("/groups", getGroupsHandler).Methods("GET")
	router.HandleFunc("/groups", optionsHandler).Methods("OPTIONS")
	router.HandleFunc("/health", healthHandler).Methods("GET")
	router.HandleFunc("/health", optionsHandler).Methods("OPTIONS")

	// CORS対応
	corsHandler := enableCORS(router)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Casbin Authorization Server starting on port %s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, corsHandler))
}

func initializeCasbin() {
	usePostgreSQL := os.Getenv("USE_POSTGRES") == "true"
	
	if usePostgreSQL {
		// PostgreSQL使用
		db := connectToPostgreSQL()
		if db == nil {
			log.Println("PostgreSQL connection failed, falling back to file-based storage")
			usePostgreSQL = false
		} else {
			// GORMアダプターを作成
			adapter, err := gormadapter.NewAdapterByDB(db)
			if err != nil {
				log.Printf("Failed to create GORM adapter: %v, falling back to file-based storage", err)
				usePostgreSQL = false
			} else {
				// モデルファイルのパスを指定
				modelPath := "./model.conf"
				if _, err := os.Stat("/app/model.conf"); err == nil {
					modelPath = "/app/model.conf"
				} else if _, err := os.Stat("data/model.conf"); err == nil {
					modelPath = "data/model.conf"
				}
				
				// Enforcerを初期化
				enforcer, err = casbin.NewEnforcer(modelPath, adapter)
				if err != nil {
					log.Printf("Failed to create enforcer with PostgreSQL: %v, falling back to file-based storage", err)
					usePostgreSQL = false
				} else {
					// 初回起動時にCSVからポリシーをロード
					if os.Getenv("LOAD_INITIAL_POLICIES") == "true" {
						if err := loadInitialPolicies(adapter); err != nil {
							log.Printf("Warning: Failed to load initial policies: %v", err)
						}
					}
					
					// ポリシーをロード
					enforcer.LoadPolicy()
					log.Println("Casbin enforcer initialized with PostgreSQL adapter")
				}
			}
		}
	}
	
	if !usePostgreSQL {
		// ファイルベース（既存の実装）
		modelPath := "./model.conf"
		policyPath := "./policy.csv"
		
		// 本番環境用のパス（Dockerコンテナ内）
		if _, err := os.Stat("/app/model.conf"); err == nil {
			modelPath = "/app/model.conf"
			policyPath = "/app/policy.csv"
		} else if _, err := os.Stat("data/model.conf"); err == nil {
			modelPath = "data/model.conf"
			policyPath = "data/policy.csv"
		}

		var err error
		enforcer, err = casbin.NewEnforcer(modelPath, policyPath)
		if err != nil {
			log.Fatal("Failed to create enforcer:", err)
		}

		// ポリシーの自動保存を有効化
		enforcer.EnableAutoSave(true)
		log.Println("Casbin enforcer initialized with file-based storage")
	}
	
	// デバッグ: ポリシーとグループポリシーを出力
	fmt.Println("=== Loaded Policies ===")
	policies := enforcer.GetPolicy()
	for _, policy := range policies {
		fmt.Printf("Policy: %v\n", policy)
	}
	
	fmt.Println("=== Loaded Group Policies ===")
	groupPolicies := enforcer.GetGroupingPolicy()
	for _, group := range groupPolicies {
		fmt.Printf("Group: %v\n", group)
	}
}

func authorizeHandler(w http.ResponseWriter, r *http.Request) {
	var authReq AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&authReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	fmt.Printf("Authorization request: subject=%s, object=%s, action=%s\n", authReq.Subject, authReq.Object, authReq.Action)
	
	// ユーザーのロール確認
	roles, _ := enforcer.GetRolesForUser(authReq.Subject)
	fmt.Printf("User %s has roles: %v\n", authReq.Subject, roles)

	allowed, err := enforcer.Enforce(authReq.Subject, authReq.Object, authReq.Action)
	if err != nil {
		fmt.Printf("Authorization error: %v\n", err)
		http.Error(w, "Authorization check failed", http.StatusInternalServerError)
		return
	}

	fmt.Printf("Authorization result: %v\n", allowed)

	response := AuthResponse{
		Allowed: allowed,
	}

	if !allowed {
		response.Reason = "Access denied by policy"
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func getPoliciesHandler(w http.ResponseWriter, r *http.Request) {
	policies := enforcer.GetPolicy()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"policies": policies,
	})
}

func getGroupsHandler(w http.ResponseWriter, r *http.Request) {
	groupPolicies := enforcer.GetGroupingPolicy()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"groups": groupPolicies,
	})
}

func addPolicyHandler(w http.ResponseWriter, r *http.Request) {
	var policyReq PolicyRequest
	if err := json.NewDecoder(r.Body).Decode(&policyReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if len(policyReq.Policy) < 3 {
		http.Error(w, "Policy must have at least 3 elements: subject, object, action", http.StatusBadRequest)
		return
	}

	added, err := enforcer.AddPolicy(policyReq.Policy)
	if err != nil {
		http.Error(w, "Failed to add policy", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"added": added,
		"policy": policyReq.Policy,
	})
}

func removePolicyHandler(w http.ResponseWriter, r *http.Request) {
	var policyReq PolicyRequest
	if err := json.NewDecoder(r.Body).Decode(&policyReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if len(policyReq.Policy) < 3 {
		http.Error(w, "Policy must have at least 3 elements: subject, object, action", http.StatusBadRequest)
		return
	}

	removed, err := enforcer.RemovePolicy(policyReq.Policy)
	if err != nil {
		http.Error(w, "Failed to remove policy", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"removed": removed,
		"policy": policyReq.Policy,
	})
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	storage := "file-based"
	if os.Getenv("USE_POSTGRES") == "true" {
		storage = "postgresql"
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "healthy",
		"service": "casbin-authorization-server",
		"storage": storage,
	})
}

func optionsHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
} 