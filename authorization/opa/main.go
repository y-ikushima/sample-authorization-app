package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/open-policy-agent/opa/rego"
	"gopkg.in/yaml.v2"
)

type AuthRequest struct {
	Subject    string `json:"subject"`
	Resource   string `json:"resource"`
	Permission string `json:"permission"`
}

type AuthResponse struct {
	Allowed bool        `json:"allowed"`
	Reason  string      `json:"reason,omitempty"`
	Debug   interface{} `json:"debug,omitempty"`
}

type PolicyRequest struct {
	Query string      `json:"query"`
	Input interface{} `json:"input"`
}

type Config struct {
	Users           map[string]User         `yaml:"users"`
	Resources       Resources               `yaml:"resources"`
	RolePermissions map[string][]string     `yaml:"role_permissions"`
}

type User struct {
	Role  string `yaml:"role"`
	Name  string `yaml:"name"`
	Email string `yaml:"email"`
}

type Resources struct {
	Systems         []Resource `yaml:"systems"`
	AwsAccounts     []Resource `yaml:"aws_accounts"`
	GlobalResources []Resource `yaml:"global_resources"`
}

type Resource struct {
	ID      string   `yaml:"id"`
	Name    string   `yaml:"name"`
	Owner   string   `yaml:"owner,omitempty"`
	Manager string   `yaml:"manager,omitempty"`
	Admin   string   `yaml:"admin,omitempty"`
	Staff   []string `yaml:"staff,omitempty"`
	Viewers []string `yaml:"viewers,omitempty"`
	Users   []string `yaml:"users,omitempty"`
}

var (
	regoQuery *rego.PreparedEvalQuery
	config    Config
)

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
	fmt.Println("Initializing OPA Authorization Server...")

	// 設定ファイルの読み込み
	if err := loadConfig(); err != nil {
		log.Fatal("Failed to load config:", err)
	}

	// OPAポリシーの準備
	if err := initializeOPA(); err != nil {
		log.Fatal("Failed to initialize OPA:", err)
	}

	router := mux.NewRouter()

	// API endpoints
	router.HandleFunc("/authorize", authorizeHandler).Methods("POST")
	router.HandleFunc("/authorize", optionsHandler).Methods("OPTIONS")
	router.HandleFunc("/evaluate", evaluateHandler).Methods("POST")
	router.HandleFunc("/evaluate", optionsHandler).Methods("OPTIONS")
	router.HandleFunc("/users", getUsersHandler).Methods("GET")
	router.HandleFunc("/users", optionsHandler).Methods("OPTIONS")
	router.HandleFunc("/resources", getResourcesHandler).Methods("GET")
	router.HandleFunc("/resources", optionsHandler).Methods("OPTIONS")
	router.HandleFunc("/health", healthHandler).Methods("GET")
	router.HandleFunc("/health", optionsHandler).Methods("OPTIONS")

	// CORS対応
	corsHandler := enableCORS(router)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	fmt.Printf("OPA Authorization Server starting on port %s\n", port)
	fmt.Printf("Loaded %d users from config file\n", len(config.Users))
	log.Fatal(http.ListenAndServe(":"+port, corsHandler))
}

func loadConfig() error {
	configPath := "./config.yaml"
	if _, err := os.Stat("/app/config.yaml"); err == nil {
		configPath = "/app/config.yaml" // Docker環境用
	}

	data, err := ioutil.ReadFile(configPath)
	if err != nil {
		return fmt.Errorf("failed to read config file: %v", err)
	}

	if err := yaml.Unmarshal(data, &config); err != nil {
		return fmt.Errorf("failed to parse YAML: %v", err)
	}

	return nil
}

func initializeOPA() error {
	policyPath := "./policy.rego"
	if _, err := os.Stat("/app/policy.rego"); err == nil {
		policyPath = "/app/policy.rego" // Docker環境用
	}

	policyData, err := ioutil.ReadFile(policyPath)
	if err != nil {
		return fmt.Errorf("failed to read policy file: %v", err)
	}

	// Regoクエリの準備
	query, err := rego.New(
		rego.Query("data.authz.allow"),
		rego.Module("policy.rego", string(policyData)),
	).PrepareForEval(context.Background())

	if err != nil {
		return fmt.Errorf("failed to prepare query: %v", err)
	}

	regoQuery = &query
	return nil
}

func authorizeHandler(w http.ResponseWriter, r *http.Request) {
	var authReq AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&authReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// OPAでの評価
	input := map[string]interface{}{
		"subject":    authReq.Subject,
		"resource":   authReq.Resource,
		"permission": authReq.Permission,
	}

	results, err := regoQuery.Eval(context.Background(), rego.EvalInput(input))
	if err != nil {
		http.Error(w, "Policy evaluation failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	allowed := false
	if len(results) > 0 && len(results[0].Expressions) > 0 {
		if val, ok := results[0].Expressions[0].Value.(bool); ok {
			allowed = val
		}
	}

	// 理由を取得するための追加クエリ
	reasonQuery, _ := rego.New(
		rego.Query("data.authz.reason"),
		rego.Module("policy.rego", getPolicyContent()),
	).PrepareForEval(context.Background())

	reasonResults, _ := reasonQuery.Eval(context.Background(), rego.EvalInput(input))
	reason := "Unknown"
	if len(reasonResults) > 0 && len(reasonResults[0].Expressions) > 0 {
		if val, ok := reasonResults[0].Expressions[0].Value.(string); ok {
			reason = val
		}
	}

	authResponse := AuthResponse{
		Allowed: allowed,
		Reason:  reason,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(authResponse)
}

func evaluateHandler(w http.ResponseWriter, r *http.Request) {
	var policyReq PolicyRequest
	if err := json.NewDecoder(r.Body).Decode(&policyReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// カスタムクエリの評価
	query, err := rego.New(
		rego.Query(policyReq.Query),
		rego.Module("policy.rego", getPolicyContent()),
	).PrepareForEval(context.Background())

	if err != nil {
		http.Error(w, "Invalid query: "+err.Error(), http.StatusBadRequest)
		return
	}

	results, err := query.Eval(context.Background(), rego.EvalInput(policyReq.Input))
	if err != nil {
		http.Error(w, "Query evaluation failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"results": results,
	})
}

func getUsersHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"users": config.Users,
	})
}

func getResourcesHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"resources": config.Resources,
	})
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "healthy",
		"service": "opa-authorization-server",
		"users":   fmt.Sprintf("%d loaded from config", len(config.Users)),
	})
}

func getPolicyContent() string {
	policyPath := "./policy.rego"
	if _, err := os.Stat("/app/policy.rego"); err == nil {
		policyPath = "/app/policy.rego"
	}

	data, err := ioutil.ReadFile(policyPath)
	if err != nil {
		return ""
	}
	return string(data)
}

func optionsHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
} 