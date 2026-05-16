package api

import (
	"encoding/json"
	"errors"
	"strconv"
	"strings"

	"ark-lmd-go-backend/internal/calc"
	"ark-lmd-go-backend/internal/data"
)

type findPathsRequest struct {
	Target     json.Number                `json:"target"`
	Settings   *settings                  `json:"settings"`
	UserLimits map[string]json.RawMessage `json:"userLimits"`
	RawGoal    any                        `json:"rawGoal"`
	CalcMode   string                     `json:"calcMode"`
}

type settings struct {
	Allow3Star           bool `json:"allow3Star"`
	Allow2Star           bool `json:"allow2Star"`
	AllowMaterial        bool `json:"allowMaterial"`
	AllowStore20         bool `json:"allowStore20"`
	AllowStore10         bool `json:"allowStore10"`
	AllowStore70         bool `json:"allowStore70"`
	AllowStore2000       bool `json:"allowStore2000"`
	AllowStore5000       bool `json:"allowStore5000"`
	AllowCE              bool `json:"allowCE"`
	AllowExt25           bool `json:"allowExt25"`
	AllowTrade           bool `json:"allowTrade"`
	AllowUpgradeOnly0    bool `json:"allowUpgradeOnly0"`
	AllowUpgradeOnly1    bool `json:"allowUpgradeOnly1"`
	AllowUpgradeOnly2    bool `json:"allowUpgradeOnly2"`
	AllowUpgradeOnlyFor1 bool `json:"allowUpgradeOnlyFor1"`
	AllowOrundumsGreen   bool `json:"allowOrundumsGreen"`
	AllowOrundumsDevice  bool `json:"allowOrundumsDevice"`
}

func (r findPathsRequest) parseTarget() (int, error) {
	return parseJSONNumberInt(r.Target)
}

func filterItems(items []data.Item, s settings) []data.Item {
	filtered := make([]data.Item, 0, len(items))
	for _, item := range items {
		t := strings.ToLower(item.Type)
		isUpgradeAllowed := true
		if s.AllowUpgradeOnlyFor1 {
			isUpgradeAllowed = t != "upgrade"
		}
		if (s.Allow3Star || t != "3_star") &&
			(s.Allow2Star || t != "2_star") &&
			(s.AllowMaterial || t != "material") &&
			(s.AllowStore20 || t != "store_20") &&
			(s.AllowStore10 || t != "store_10") &&
			(s.AllowStore70 || t != "store_70") &&
			(s.AllowStore2000 || t != "store_2000") &&
			(s.AllowStore5000 || t != "store_5000") &&
			(s.AllowCE || t != "ce") &&
			(s.AllowExt25 || t != "ext_25") &&
			(s.AllowTrade || t != "trade") &&
			(s.AllowUpgradeOnly0 || t != "upgrade_only_0") &&
			(s.AllowUpgradeOnly1 || t != "upgrade_only_1") &&
			(s.AllowUpgradeOnly2 || t != "upgrade_only_2") &&
			(s.AllowOrundumsGreen || item.ID != 220) &&
			(s.AllowOrundumsDevice || item.ID != 221) &&
			isUpgradeAllowed {
			filtered = append(filtered, item)
		}
	}
	return filtered
}

func parseLimits(raw map[string]json.RawMessage) (calc.Limits, error) {
	values := map[string]int{
		"upgrade0Limit": 10,
		"upgrade1Limit": 10,
		"upgrade2Limit": 10,
		"sanityLimit":   200,
		"trade2Limit":   10,
		"trade3Limit":   10,
		"trade4Limit":   10,
		"trade5Limit":   10,
	}

	for key := range values {
		value, ok, err := parseLimitValue(raw, key)
		if err != nil {
			return calc.Limits{}, err
		}
		if ok {
			values[key] = value
		}
	}

	return calc.Limits{
		Upgrade0Limit: values["upgrade0Limit"],
		Upgrade1Limit: values["upgrade1Limit"],
		Upgrade2Limit: values["upgrade2Limit"],
		SanityLimit:   values["sanityLimit"],
		Trade2Limit:   values["trade2Limit"],
		Trade3Limit:   values["trade3Limit"],
		Trade4Limit:   values["trade4Limit"],
		Trade5Limit:   values["trade5Limit"],
	}, nil
}

func parseLimitValue(raw map[string]json.RawMessage, key string) (int, bool, error) {
	if raw == nil {
		return 0, false, nil
	}
	bytes, exists := raw[key]
	if !exists || string(bytes) == "null" {
		return 0, false, nil
	}

	var number json.Number
	if err := json.Unmarshal(bytes, &number); err != nil {
		return 0, false, err
	}
	value, err := strconv.Atoi(number.String())
	if err != nil {
		return 0, false, err
	}

	maxVal := 10
	if key == "sanityLimit" {
		maxVal = 200
	}
	if value < 0 || value > maxVal {
		return 0, false, errors.New("limit out of range")
	}
	return value, true, nil
}
