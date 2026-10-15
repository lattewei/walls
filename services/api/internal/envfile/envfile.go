package envfile

import (
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

// Load walks up from the working directory and loads the first .env found.
// Missing files are ignored. Explicit OS env always wins over .env values.
func Load() {
	wd, err := os.Getwd()
	if err != nil {
		return
	}

	dir := wd
	for i := 0; i < 6; i++ {
		candidate := filepath.Join(dir, ".env")
		if st, err := os.Stat(candidate); err == nil && !st.IsDir() {
			_ = godotenv.Load(candidate)
			return
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
}
