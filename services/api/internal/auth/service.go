package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/lattewei/walls/services/api/internal/domain"
	"github.com/lattewei/walls/services/api/internal/users"
)

type Service struct {
	users  *users.Repository
	tokens *TokenService
}

func NewService(userRepo *users.Repository, tokens *TokenService) *Service {
	return &Service{users: userRepo, tokens: tokens}
}

type RegisterInput struct {
	Handle      string
	Password    string
	DisplayName string
}

type LoginInput struct {
	Handle   string
	Password string
}

type AuthResult struct {
	User        domain.PublicUser     `json:"user"`
	Contacts    domain.PublicContacts `json:"contacts"`
	AccessToken string                `json:"access_token"`
	TokenType   string                `json:"token_type"`
	ExpiresAt   string                `json:"expires_at"`
}

type UpdateProfileInput struct {
	DisplayName        *string
	Bio                *string
	PublicContactEmail **string
	InstagramURL       **string
	OtherLinks         *[]domain.ExternalLink
}

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

	return s.issue(ctx, user)
}

func (s *Service) Login(ctx context.Context, in LoginInput) (AuthResult, error) {
	handle := users.NormalizeHandle(in.Handle)
	if handle == "" || in.Password == "" {
		return AuthResult{}, ErrInvalidCredentials
	}

	user, err := s.users.GetByHandle(ctx, handle)
	hash := dummyHash
	switch {
	case errors.Is(err, users.ErrNotFound):
		user = domain.User{}
	case err != nil:
		return AuthResult{}, err
	default:
		hash = user.PasswordHash
	}
	if !CheckPassword(hash, in.Password) || user.ID == "" {
		return AuthResult{}, ErrInvalidCredentials
	}

	return s.issue(ctx, user)
}

func (s *Service) Logout(ctx context.Context, userID string) error {
	if err := s.users.BumpSession(ctx, userID); err != nil {
		if errors.Is(err, users.ErrNotFound) {
			return ErrUnauthorized
		}
		return err
	}
	return nil
}

func (s *Service) Me(ctx context.Context, userID string) (domain.MeResponse, error) {
	user, err := s.users.GetByID(ctx, userID)
	if errors.Is(err, users.ErrNotFound) {
		return domain.MeResponse{}, ErrUnauthorized
	}
	if err != nil {
		return domain.MeResponse{}, err
	}

	profile, err := s.users.GetProducerProfile(ctx, userID)
	if err != nil {
		return domain.MeResponse{}, err
	}

	return domain.MeResponse{
		User:     user.ToPublic(),
		Contacts: profile.ToPublic(),
	}, nil
}

func (s *Service) UpdateProfile(ctx context.Context, userID string, in UpdateProfileInput) (domain.MeResponse, error) {
	user, err := s.users.GetByID(ctx, userID)
	if errors.Is(err, users.ErrNotFound) {
		return domain.MeResponse{}, ErrUnauthorized
	}
	if err != nil {
		return domain.MeResponse{}, err
	}

	touchUser := in.DisplayName != nil || in.Bio != nil
	touchContacts := in.PublicContactEmail != nil || in.InstagramURL != nil || in.OtherLinks != nil
	if !touchUser && !touchContacts {
		return domain.MeResponse{}, fmt.Errorf("%w: no fields to update", ErrValidation)
	}

	if touchUser {
		displayName := user.DisplayName
		if in.DisplayName != nil {
			displayName = strings.TrimSpace(*in.DisplayName)
			if err := ValidateDisplayName(displayName); err != nil {
				return domain.MeResponse{}, fmt.Errorf("%w: %s", ErrValidation, err.Error())
			}
		}

		bio := user.Bio
		if in.Bio != nil {
			b := strings.TrimSpace(*in.Bio)
			if err := ValidateBio(b); err != nil {
				return domain.MeResponse{}, fmt.Errorf("%w: %s", ErrValidation, err.Error())
			}
			if b == "" {
				bio = nil
			} else {
				bio = &b
			}
		}

		user.DisplayName = displayName
		user.Bio = bio
	}

	profile, err := s.users.GetProducerProfile(ctx, userID)
	if err != nil {
		return domain.MeResponse{}, err
	}

	if touchContacts {
		if in.PublicContactEmail != nil {
			if *in.PublicContactEmail == nil {
				profile.PublicContactEmail = nil
			} else {
				email := strings.TrimSpace(**in.PublicContactEmail)
				if err := ValidatePublicEmail(email); err != nil {
					return domain.MeResponse{}, fmt.Errorf("%w: %s", ErrValidation, err.Error())
				}
				profile.PublicContactEmail = PtrString(email)
			}
		}
		if in.InstagramURL != nil {
			if *in.InstagramURL == nil {
				profile.InstagramURL = nil
			} else {
				ig := strings.TrimSpace(**in.InstagramURL)
				if err := ValidateInstagramURL(ig); err != nil {
					return domain.MeResponse{}, fmt.Errorf("%w: %s", ErrValidation, err.Error())
				}
				profile.InstagramURL = PtrString(ig)
			}
		}
		if in.OtherLinks != nil {
			links := NormalizeOtherLinks(*in.OtherLinks)
			if err := ValidateOtherLinks(links); err != nil {
				return domain.MeResponse{}, fmt.Errorf("%w: %s", ErrValidation, err.Error())
			}
			profile.OtherLinks = links
		}

	}

	savedUser, savedProfile, err := s.users.SaveAccount(ctx, userID, user.DisplayName, user.Bio, profile)
	if err != nil {
		if errors.Is(err, users.ErrNotFound) {
			return domain.MeResponse{}, ErrUnauthorized
		}
		return domain.MeResponse{}, err
	}
	return domain.MeResponse{
		User:     savedUser.ToPublic(),
		Contacts: savedProfile.ToPublic(),
	}, nil
}

func (s *Service) issue(ctx context.Context, user domain.User) (AuthResult, error) {
	state, err := s.users.AuthState(ctx, user.ID)
	if err != nil {
		return AuthResult{}, err
	}
	tok, exp, err := s.tokens.IssueAccessToken(user.ID, state.Handle, state.Role, state.SessionVersion)
	if err != nil {
		return AuthResult{}, err
	}

	profile, err := s.users.GetProducerProfile(ctx, user.ID)
	if err != nil {
		return AuthResult{}, err
	}
	user.Role = state.Role
	user.Handle = state.Handle

	return AuthResult{
		User:        user.ToPublic(),
		Contacts:    profile.ToPublic(),
		AccessToken: tok,
		TokenType:   "Bearer",
		ExpiresAt:   exp.UTC().Format(time.RFC3339),
	}, nil
}

var (
	ErrValidation         = errors.New("validation_error")
	ErrHandleTaken        = errors.New("handle_taken")
	ErrInvalidCredentials = errors.New("invalid_credentials")
	ErrUnauthorized       = errors.New("unauthorized")
)
