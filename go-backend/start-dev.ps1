$env:PORT = "3003"
$env:NODE_ENV = "test"
$env:CORS_ORIGIN = "http://localhost:3000"

go run ./cmd/server
