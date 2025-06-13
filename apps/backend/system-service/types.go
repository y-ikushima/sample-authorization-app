package main

// User Service のレスポンス構造体
type UserInfo struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

type BatchUsersRequest struct {
	UserIDs []string `json:"user_ids"`
}

type SystemUserInfo struct {
	UserID    string `json:"user_id"`
	UserName  string `json:"user_name"`
	UserEmail string `json:"user_email"`
	SystemID  string `json:"system_id"`
}

// システム更新用のリクエスト構造体
type UpdateSystemRequest struct {
	Name string `json:"Name" binding:"required"`
	Note string `json:"Note"`
} 