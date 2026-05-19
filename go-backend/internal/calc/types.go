package calc

import "ark-lmd-go-backend/internal/data"

const (
	MaxSteps          = 6
	MaxPathsPerSum    = 10
	MaxPathsForTarget = 15
	TargetPathCount   = 10
	MaxInt            = int(^uint(0) >> 1)
)

type Step struct {
	ID    int `json:"id"`
	Count int `json:"count"`
}

type Path []Step

type Limits struct {
	Upgrade0Limit int
	Upgrade1Limit int
	Upgrade2Limit int
	SanityLimit   int
	Trade2Limit   int
	Trade3Limit   int
	Trade4Limit   int
	Trade5Limit   int
}

type Denom struct {
	ID       int
	Value    int
	LimitKey string
}

type ComboResult struct {
	Steps int
	Combo Path
}

type state struct {
	Paths []Path
}

type contextState struct {
	DP            map[int]*state
	Order         []int
	MaxPaths      int
	Target        int
	ItemMap       map[int]data.Item
	ItemMeta      []itemMeta
	Upgrade0Limit int
	Upgrade1Limit int
	Upgrade2Limit int
	SanityLimit   int
	TradeLimits   map[int]int
	Caches        caches
}

type itemMeta struct {
	Value    int
	MaxCount int
	IsTrade  bool
	Exists   bool
}

type caches struct {
	Material map[int]ComboResult
	Stage    *stageComboCache
}

var TradeDenoms = []Denom{
	{ID: 222, Value: 2500, LimitKey: "trade5Limit"},
	{ID: 119, Value: 2000, LimitKey: "trade4Limit"},
	{ID: 118, Value: 1500, LimitKey: "trade3Limit"},
	{ID: 117, Value: 1000, LimitKey: "trade2Limit"},
}

var MaterialDenoms = []Denom{
	{ID: 103, Value: 400},
	{ID: 102, Value: 300},
	{ID: 101, Value: 200},
	{ID: 100, Value: 100},
}
