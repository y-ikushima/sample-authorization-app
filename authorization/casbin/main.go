package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/casbin/casbin/v2"
	"github.com/gorilla/mux"
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
	// 外部ファイルからCasbinエンフォーサーを初期化
	modelPath := "./model.conf"
	policyPath := "./policy.csv"
	
	// 本番環境用のパス（Dockerコンテナ内）
	if _, err := os.Stat("/app/model.conf"); err == nil {
		modelPath = "/app/model.conf"
		policyPath = "/app/policy.csv"
	}

	var err error
	enforcer, err = casbin.NewEnforcer(modelPath, policyPath)
	if err != nil {
		log.Fatal("Failed to create enforcer:", err)
	}

	// ポリシーの自動保存を有効化
	enforcer.EnableAutoSave(true)
	
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
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "healthy",
		"service": "casbin-authorization-server",
	})
}

func optionsHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
} 