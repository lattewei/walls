.PHONY: run migrate-up migrate-down migrate-version test tidy

run:
	go run ./cmd/api

migrate-up:
	go run ./cmd/migrate up

migrate-down:
	go run ./cmd/migrate down

migrate-version:
	go run ./cmd/migrate version

test:
	go test ./...

tidy:
	go mod tidy
