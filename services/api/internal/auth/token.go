package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	// ErrInvalidToken is returned when a token cannot be parsed or verified.
	ErrInvalidToken = errors.New("invalid token")
)

// Claims are embedded in access tokens.
type Claims struct {
	UserID string `json:"uid"`
	Handle string `json:"handle"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// TokenService issues and validates JWTs.
type TokenService struct {
	secret []byte
	ttl    time.Duration
	issuer string
}

// NewTokenService creates a JWT helper.
func NewTokenService(secret string, ttl time.Duration) *TokenService {
	return &TokenService{
		secret: []byte(secret),
		ttl:    ttl,
		issuer: "openstudio",
	}
}

// IssueAccessToken creates a signed access JWT for the user.
func (s *TokenService) IssueAccessToken(userID, handle, role string) (string, time.Time, error) {
	now := time.Now().UTC()
	exp := now.Add(s.ttl)
	claims := Claims{
		UserID: userID,
		Handle: handle,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    s.issuer,
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(exp),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(s.secret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign token: %w", err)
	}
	return signed, exp, nil
}

// ParseAccessToken validates a token and returns its claims.
func (s *TokenService) ParseAccessToken(tokenStr string) (Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.secret, nil
	})
	if err != nil {
		return Claims{}, ErrInvalidToken
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return Claims{}, ErrInvalidToken
	}
	if claims.UserID == "" {
		return Claims{}, ErrInvalidToken
	}
	return *claims, nil
}
