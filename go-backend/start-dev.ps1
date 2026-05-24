$env:PORT = "3003"
$env:NODE_ENV = "test"
$env:CORS_ORIGIN = "http://localhost:3000"
$env:ADMIN_TOKEN = "replace-with-your-admin-token"

go run ./cmd/server
