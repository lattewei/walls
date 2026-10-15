package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/openstudio/openstudio/services/api/internal/domain"
	"github.com/openstudio/openstudio/services/api/internal/users"
)

// Service implements register / login / profile operations.
type Service struct {
	users  *users.Repository
	tokens *TokenService
}

// NewService wires auth use-cases.
func NewService(userRepo *users.Repository, tokens *TokenService) *Service {
	return &Service{users: userRepo, tokens: tokens}
}

// RegisterInput is the payload for account creation.
type RegisterInput struct {
	Handle      string
	Password    string
	DisplayName string
}

// LoginInput is the payload for authentication.
type LoginInput struct {
	Handle   string
	Password string
}

// AuthResult is returned after register or login.
type AuthResult struct {
	User         domain.PublicUser `json:"user"`
	AccessToken  string            `json:"access_token"`
	TokenType    string            `json:"token_type"`
	ExpiresAt    string            `json:"expires_at"`
}

// UpdateProfileInput is the payload for PATCH /me.
type UpdateProfileInput struct {
	DisplayName *string
	Bio         *string
}

// Register creates a user and returns an access token.
func (s *Service) Register(ctx context.Context, in RegisterInput) (AuthResult, error) {
	handle := users.NormalizeHandle(in.Handle)
	if err := ValidateHandle(handle); err != nil {
		return AuthResult{}, fmt.Errorf("%w: %s", ErrValidation, err.Error())
	}
	if err := ValidatePassword(in.Password); err != nil {
		return AuthResult{}, fmt.Errorf("%w: %s", ErrValidation, err.Error())
	}

	displayName := strings.TrimSpace(in.DisplayName)
	if displayName == "" {
		displayName = handle
	}
	if err := ValidateDisplayName(displayName); err != nil {
		return AuthResult{}, fmt.Errorf("%w: %s", ErrValidation, err.Error())
	}

	hash, err := HashPassword(in.Password)
	if err != nil {
		return AuthResult{}, err
	}

	user, err := s.users.Create(ctx, handle, hash, displayName)
	if errors.Is(err, users.ErrHandleTaken) {
		return AuthResult{}, ErrHandleTaken
	}
	if err != nil {
		return AuthResult{}, err
	}

	return s.issue(user)
}

// Login authenticates by handle + password.
func (s *Service) Login(ctx context.Context, in LoginInput) (AuthResult, error) {
	handle := users.NormalizeHandle(in.Handle)
	if handle == "" || in.Password == "" {
		return AuthResult{}, ErrInvalidCredentials
	}

	user, err := s.users.GetByHandle(ctx, handle)
	if errors.Is(err, users.ErrNotFound) {
		return AuthResult{}, ErrInvalidCredentials
	}
	if err != nil {
		return AuthResult{}, err
	}

	if !CheckPassword(user.PasswordHash, in.Password) {
		return AuthResult{}, ErrInvalidCredentials
	}

	return s.issue(user)
}

// Me returns the current user by id.
func (s *Service) Me(ctx context.Context, userID string) (domain.PublicUser, error) {
	user, err := s.users.GetByID(ctx, userID)
	if errors.Is(err, users.ErrNotFound) {
		return domain.PublicUser{}, ErrUnauthorized
	}
	if err != nil {
		return domain.PublicUser{}, err
	}
	return user.ToPublic(), nil
}

// UpdateProfile updates the authenticated user's profile.
func (s *Service) UpdateProfile(ctx context.Context, userID string, in UpdateProfileInput) (domain.PublicUser, error) {
	user, err := s.users.GetByID(ctx, userID)
	if errors.Is(err, users.ErrNotFound) {
		return domain.PublicUser{}, ErrUnauthorized
	}
	if err != nil {
		return domain.PublicUser{}, err
	}

	displayName := user.DisplayName
	if in.DisplayName != nil {
		displayName = strings.TrimSpace(*in.DisplayName)
		if err := ValidateDisplayName(displayName); err != nil {
			return domain.PublicUser{}, fmt.Errorf("%w: %s", ErrValidation, err.Error())
		}
	}

	bio := user.Bio
	if in.Bio != nil {
		b := strings.TrimSpace(*in.Bio)
		if err := ValidateBio(b); err != nil {
			return domain.PublicUser{}, fmt.Errorf("%w: %s", ErrValidation, err.Error())
		}
		if b == "" {
			bio = nil
		} else {
			bio = &b
		}
	}

	updated, err := s.users.UpdateProfile(ctx, userID, displayName, bio)
	if err != nil {
		return domain.PublicUser{}, err
	}
	return updated.ToPublic(), nil
}

func (s *Service) issue(user domain.User) (AuthResult, error) {
	tok, exp, err := s.tokens.IssueAccessToken(user.ID, user.Handle, user.Role)
	if err != nil {
		return AuthResult{}, err
	}
	return AuthResult{
		User:        user.ToPublic(),
		AccessToken: tok,
		TokenType:   "Bearer",
		ExpiresAt:   exp.UTC().Format(time.RFC3339),
	}, nil
}

// Sentinel errors mapped to HTTP by the handler.
var (
	ErrValidation         = errors.New("validation_error")
	ErrHandleTaken        = errors.New("handle_taken")
	ErrInvalidCredentials = errors.New("invalid_credentials")
	ErrUnauthorized       = errors.New("unauthorized")
)
