package data

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"os"
)

type Item struct {
	ID        int    `json:"id"`
	ItemID    string `json:"item_id"`
	ItemName  string `json:"item_name"`
	ItemValue int    `json:"item_value"`
	Rarity    int    `json:"rarity"`
	Type      string `json:"type"`
	Consume   int    `json:"consume"`
}

type Store struct {
	Items   []Item
	ByID    map[int]Item
	Version string
}

func LoadItems(file string) (*Store, error) {
	bytes, err := os.ReadFile(file)
	if err != nil {
		return nil, err
	}

	var items []Item
	if err := json.Unmarshal(bytes, &items); err != nil {
		return nil, err
	}

	byID := make(map[int]Item, len(items))
	for _, item := range items {
		byID[item.ID] = item
	}

	sum := sha256.Sum256(bytes)
	version := hex.EncodeToString(sum[:])

	return &Store{Items: items, ByID: byID, Version: version}, nil
}
