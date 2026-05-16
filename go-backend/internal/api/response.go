package api

import "ark-lmd-go-backend/internal/calc"

type findPathsResponse struct {
	Success  bool        `json:"success"`
	Paths    []calc.Path `json:"paths"`
	Duration int64       `json:"duration"`
	Cache    string      `json:"cache"`
}
